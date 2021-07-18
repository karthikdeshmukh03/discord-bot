"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.doUnTimeout = void 0;
const discord_js_1 = require("discord.js");
const moment_1 = __importDefault(require("moment"));
require("moment-timer");
const __1 = require("..");
const durationRegex = /^([0-9]+)\s*(y|M|w|d|h|m|s|ms)$/;
const verifiedRoleId = '260524994646376449';
const timeoutRoleId = '392860547626041345';
const timeoutChannelId = '392860089951846400';
const doTimeout = (guild, dispatcher, members, duration, reason) => __awaiter(void 0, void 0, void 0, function* () {
    // remove verified role and add DQ role for all mentioned members that are not already DQ'd
    yield Promise.all(members.filter(member => !member.roles.cache.has(timeoutRoleId)).array().flatMap(member => [
        member.roles.remove(verifiedRoleId, 'DQ'),
        member.roles.add(timeoutRoleId, 'DQ')
    ]));
    const membersStr = members.map(m => `${m}`).join('\n');
    const announcement = new discord_js_1.MessageEmbed()
        .setAuthor(dispatcher.displayName, dispatcher.user.displayAvatarURL(), __1.userUrl(dispatcher.user.id))
        .setTitle('Disqualification')
        .setThumbnail('https://ton.twimg.com/stickers/stickers/10855_raw.png') // :checkered_flag:
        .addField('Reason', reason || 'unspecified')
        .addField('Duration', duration.humanize())
        .addField('Affected users', membersStr);
    const channel = guild.channels.cache.get(timeoutChannelId);
    yield channel.send(announcement);
});
const doUnTimeout = (guildId, userId) => __awaiter(void 0, void 0, void 0, function* () {
    const guild = __1.client.guilds.cache.get(guildId);
    const member = guild.members.cache.get(userId);
    if (member) {
        yield Promise.all([
            member.roles.remove(timeoutRoleId, 'DQ over'),
            member.roles.add(verifiedRoleId, 'DQ over')
        ]);
    }
    yield __1.db().collection('dqs').deleteOne({
        _id: {
            guild: guildId,
            user: userId
        }
    });
});
exports.doUnTimeout = doUnTimeout;
class DqCommand {
    /**
     * format: <prefix> dq \S <duration> <mentions> ( \S <reason> )?
     *  where:
     *    <duration>: [0-9]+ <unit>
     *        <unit>: ( y | M | w | d | h | m | s | ms )
     *    <mentions>: <mention> ( \S <mention> )*
     *      <reason>: .+
     */
    execute(message, args) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            if (!message.guild) {
                return message.reply('that command is only available in servers.');
            }
            if (!message.member.hasPermission(discord_js_1.Permissions.FLAGS.MANAGE_ROLES)) {
                return message.reply('you must have the Manage Roles permission to use that command.');
            }
            if (message.member.roles.highest.comparePositionTo(message.guild.roles.resolve(timeoutRoleId)) <= 0) {
                return message.reply(`you must have a role higher than <@&${timeoutRoleId}> to use that command.`);
            }
            if (!message.mentions.members.size) {
                return message.reply('you must mention at least one member to DQ.');
            }
            // strip @-mentions out of the args string because we just care about the duration and reason
            const [durationStr, ...reasonArr] = args.trim().split(/\s+/).filter(e => !discord_js_1.MessageMentions.USERS_PATTERN.test(e));
            const reason = reasonArr.join(' ');
            // make sure that the user only gives a valid shorthand duration specifier. moment doesn't check this properly still (see moment/moment#1805)
            const matches = (_a = durationStr.match(durationRegex)) === null || _a === void 0 ? void 0 : _a.slice(1, 3);
            if ((matches === null || matches === void 0 ? void 0 : matches.length) !== 2) {
                return message.reply(`invalid duration \`${durationStr}\`. valid units are \`y\`, \`M\`, \`w\`, \`d\`, \`h\`, \`m\`, \`s\`, and \`ms\`.`);
            }
            const duration = moment_1.default.duration(...matches);
            duration.timer({ start: true }, () => message.mentions.members.forEach(m => exports.doUnTimeout(m.guild.id, m.id)));
            const dqEndTime = moment_1.default().add(duration).valueOf();
            yield doTimeout(message.guild, message.member, message.mentions.members, duration, reason);
            yield __1.db().collection('dqs').bulkWrite(message.mentions.users.map(u => {
                return {
                    updateOne: {
                        filter: {
                            _id: {
                                guild: message.guild.id,
                                user: u.id
                            }
                        },
                        update: {
                            $set: { dqEndTime }
                        },
                        upsert: true
                    }
                };
            }));
        });
    }
}
exports.default = new DqCommand();
//# sourceMappingURL=dq.js.map
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
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const __1 = require("..");
const messages_1 = require("../messages");
const statusEmojis = {
    online: '<:online:462707431865188354>',
    offline: '<:offline:462707499133304842>',
    idle: '<:idle:462707524869816330>',
    dnd: '<:dnd:462707542389161994>',
    streaming: '<:streaming:462707566552547369>',
    invisible: '<:invisible:462707587570204682>'
};
class Profile {
    execute(message, args) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            let user, member;
            if (!args) {
                user = message.author;
                member = message.member;
            }
            else {
                user = message.mentions.users.first();
                member = (_a = message.mentions.members) === null || _a === void 0 ? void 0 : _a.first();
            }
            if (!user) {
                return message.reply('please mention a user to obtain their profile.');
            }
            const presenceStatus = user.presence.status;
            let status;
            if (presenceStatus === 'dnd') {
                status = 'Do Not Disturb';
            }
            else {
                status = presenceStatus.charAt(0).toUpperCase() + presenceStatus.slice(1);
            }
            status = `${statusEmojis[presenceStatus]} ${status}`;
            const joinedDiscord = `${Math.floor((Date.now() - user.createdTimestamp) / 86400000)} days ago`;
            const embed = new discord_js_1.MessageEmbed()
                .setColor((member === null || member === void 0 ? void 0 : member.displayHexColor) || discord_js_1.Constants.Colors.WHITE)
                .setAuthor((member === null || member === void 0 ? void 0 : member.displayName) || user.username, user.displayAvatarURL())
                .setImage(user.displayAvatarURL({ size: 2048 }))
                .addField('Status', status, true)
                .addField('Joined Discord', joinedDiscord, true);
            if (message.guild) {
                const joinedServer = `${Math.floor((Date.now() - member.joinedTimestamp) / 86400000)} days ago`;
                embed.addField('Joined Server', joinedServer, true);
                try {
                    const leaderboardUser = yield __1.db().collection('messages').aggregate()
                        .match({ '_id.guild': message.guild.id, '_id.channel': { $in: messages_1.leaderboardChannels }, '_id.user': user.id })
                        .group({ _id: '$_id.user', count: { $sum: '$count' } })
                        .next();
                    const messageCount = (leaderboardUser === null || leaderboardUser === void 0 ? void 0 : leaderboardUser.count) || 0;
                    embed.addField('Messages', messageCount, true);
                }
                catch (error) {
                    console.error(error);
                }
                const roles = member.roles.cache.filter(role => role.id != message.guild.id);
                if (roles.size) {
                    const rolesString = roles.sort((a, b) => b.comparePositionTo(a)).array().join(', ');
                    embed.addField('Roles', rolesString, true);
                }
            }
            const reply = yield message.channel.send(embed);
            return __1.addFooter(message, reply);
        });
    }
}
exports.default = new Profile();
//# sourceMappingURL=profile.js.map
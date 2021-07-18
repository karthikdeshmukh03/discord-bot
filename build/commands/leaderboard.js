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
const rankEmojis = ['🥇', '🥈', '🥉'];
const pageSize = 10;
const previous = '🔺';
const next = '🔻';
const getDescription = (users, index = 0) => {
    let description = '';
    for (let i = index; i < users.length && i < (index + pageSize); i++) {
        const user = users[i];
        const rank = (i < 3) ? `\u200B ${rankEmojis[i]} \u200B \u200B \u200B \u200B` : `**\`#${String(i + 1).padEnd(3)}\`**`;
        description += `${rank} <@${user._id}> \`${user.count} messages\`\n`;
    }
    return description;
};
class LeaderboardCommand {
    execute(message) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!message.guild) {
                return message.reply('that command is only available in servers.');
            }
            const leaderboard = yield __1.db().collection('messages').aggregate()
                .match({ '_id.guild': message.guild.id, '_id.channel': { $in: messages_1.leaderboardChannels } })
                .group({ _id: '$_id.user', count: { $sum: '$count' } })
                .sort({ count: -1 })
                .toArray();
            const embed = new discord_js_1.MessageEmbed()
                .setColor('RANDOM')
                .setTitle('Message Leaderboard:')
                .setDescription(getDescription(leaderboard));
            const reply = yield message.channel.send(embed);
            let index = 0;
            const collector = reply.createReactionCollector((reaction, user) => {
                return user.id === message.author.id && [previous, next].includes(reaction.emoji.name);
            }, { time: 30000, dispose: true });
            collector.on('collect', (reaction) => {
                index += (reaction.emoji.name === next ? 1 : -1) * pageSize;
                if (index >= leaderboard.length) {
                    index = 0;
                }
                else if (index < 0) {
                    index = Math.max(leaderboard.length - pageSize, 0);
                }
                reply.edit(embed.setDescription(getDescription(leaderboard, index))).catch(console.error);
            });
            collector.on('remove', (reaction, user) => {
                if (user.id === message.author.id) {
                    index += (reaction.emoji.name === next ? 1 : -1) * pageSize;
                    if (index >= leaderboard.length) {
                        index = 0;
                    }
                    else if (index < 0) {
                        index = Math.max(leaderboard.length - pageSize, 0);
                    }
                    reply.edit(embed.setDescription(getDescription(leaderboard, index))).catch(console.error);
                }
            });
            collector.on('end', () => {
                reply.reactions.removeAll().catch(console.error);
                __1.addFooter(message, reply);
            });
            yield reply.react(previous);
            yield reply.react(next);
        });
    }
}
exports.default = new LeaderboardCommand();
//# sourceMappingURL=leaderboard.js.map
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
const formatTime = (time, unit) => `${time} ${unit}${(time == 1) ? '' : 's'}`;
class UptimeCommand {
    execute(message) {
        return __awaiter(this, void 0, void 0, function* () {
            const milliseconds = new Date(__1.client.uptime).getTime();
            let seconds = Math.floor(milliseconds / 1000);
            let minutes = Math.floor(seconds / 60);
            let hours = Math.floor(minutes / 60);
            const days = Math.floor(hours / 24);
            seconds %= 60;
            minutes %= 60;
            hours %= 24;
            const uptime = [];
            if (days) {
                uptime.push(formatTime(days, 'day'));
            }
            if (hours) {
                uptime.push(formatTime(hours, 'hour'));
            }
            if (minutes) {
                uptime.push(formatTime(minutes, 'minute'));
            }
            if (seconds) {
                uptime.push(formatTime(seconds, 'second'));
            }
            const embed = new discord_js_1.MessageEmbed()
                .setColor('RANDOM')
                .setDescription(`🕒 ${uptime.join(', ')}`);
            const reply = yield message.channel.send(embed);
            return __1.addFooter(message, reply);
        });
    }
}
exports.default = new UptimeCommand();
//# sourceMappingURL=uptime.js.map
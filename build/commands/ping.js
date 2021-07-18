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
class PingCommand {
    execute(message) {
        return __awaiter(this, void 0, void 0, function* () {
            const ping = Date.now();
            const embed = new discord_js_1.MessageEmbed()
                .setColor('RANDOM')
                .setDescription('🏓 Pong!');
            let reply = yield message.channel.send(embed);
            reply = yield reply.edit(embed.setDescription(`${embed.description} \`${(Date.now() - ping) / 1000}s\``));
            return __1.addFooter(message, reply);
        });
    }
}
exports.default = new PingCommand();
//# sourceMappingURL=ping.js.map
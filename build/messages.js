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
exports.updateGuilds = exports.updateChannel = exports.upsertMessageInDb = exports.leaderboardChannels = void 0;
const discord_js_1 = require("discord.js");
const _1 = require(".");
exports.leaderboardChannels = [
    '260546095082504202',
    '360136094500519946',
    '342822239076483074',
    '198658294007463936',
    '198658074876182538',
    '260546551255007232',
    '197818075796471808',
    '442826048120291338',
    '198658419945635840',
    '329477820076130306' // Dev server.
];
const upsertMessageInDb = (message, inc = 1) => __awaiter(void 0, void 0, void 0, function* () {
    const guild = message.guild.id;
    const channel = message.channel.id;
    const id = message.id;
    yield Promise.all([
        _1.db().collection('channels').updateOne({
            _id: {
                guild,
                channel
            }
        }, {
            $max: { last: id },
            $min: { first: id }
        }, {
            upsert: true
        }),
        _1.db().collection('messages').updateOne({
            _id: {
                guild,
                channel,
                user: message.author.id
            }
        }, {
            $inc: { count: inc }
        }, {
            upsert: true
        })
    ]);
});
exports.upsertMessageInDb = upsertMessageInDb;
const updateChannel = (channel) => __awaiter(void 0, void 0, void 0, function* () {
    if (!channel.permissionsFor(_1.client.user).has(discord_js_1.Permissions.FLAGS.VIEW_CHANNEL | discord_js_1.Permissions.FLAGS.READ_MESSAGE_HISTORY)) {
        return;
    }
    const id = channel.lastMessageID;
    const messageManager = channel.messages;
    const firstMessage = (yield _1.db().collection('channels').findOneAndUpdate({
        _id: {
            guild: channel.guild.id,
            channel: channel.id
        }
    }, {
        $setOnInsert: {
            first: id,
            last: id
        }
    }, {
        upsert: true,
        returnOriginal: false
    })).value.first;
    const options = {
        before: firstMessage,
        limit: 100
    };
    let messages;
    do {
        try {
            messages = yield messageManager.fetch(options, false);
            for (const message of messages.values()) {
                yield exports.upsertMessageInDb(message, 1);
                options.before = message.id;
            }
        }
        catch (err) {
            console.error(err);
            console.log(`Retrying from #${channel.name}, at ${options.before}.`);
        }
    } while (!messages || messages.size);
    console.log(`Done with #${channel.name}.`);
});
exports.updateChannel = updateChannel;
const updateGuild = (guild) => __awaiter(void 0, void 0, void 0, function* () {
    for (const channel of guild.channels.cache.filter(channel => channel.type === 'text').values()) {
        try {
            yield exports.updateChannel(channel);
        }
        catch (err) {
            console.error(err);
        }
    }
    console.log(`Done with ${guild.name}`);
});
const updateGuilds = () => __awaiter(void 0, void 0, void 0, function* () {
    for (const guild of _1.client.guilds.cache.values()) {
        try {
            yield updateGuild(guild);
        }
        catch (err) {
            console.error(err);
        }
    }
    console.log('Done updating messages.');
});
exports.updateGuilds = updateGuilds;
//# sourceMappingURL=messages.js.map
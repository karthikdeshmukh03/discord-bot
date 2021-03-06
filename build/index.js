"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
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
exports.userUrl = exports.addFooter = exports.db = exports.client = void 0;
const discord_js_1 = require("discord.js");
const moment_1 = __importDefault(require("moment"));
require("moment-timer");
const mongodb_1 = require("mongodb");
const util_1 = require("util");
const dq_1 = require("./commands/dq");
const messages = __importStar(require("./messages"));
const verify_1 = require("./verify");
class CachedInvite {
    constructor(invite) {
        this.inviter = invite.inviter.id;
        this.code = invite.code;
        this.uses = invite.uses;
        this.maxUses = invite.maxUses;
        this.expiresTimestamp = invite.expiresTimestamp;
    }
}
exports.client = new discord_js_1.Client();
const token = process.env.BIGBRO_TOKEN;
const dbUri = process.env.BIGBRO_DB;
const ownerId = process.env.DISCORD_ID;
const mongoOptions = {
    retryWrites: true,
    useNewUrlParser: true,
    useUnifiedTopology: true
};
const prefix = '%';
const commandInfo = {
    ping: 'Pong!',
    uptime: 'Time since bot last restarted.',
    leaderboard: 'Users with the most messages on the server.',
    profile: 'Information about a user.',
    dq: 'Disqualify a user or users.',
};
const commands = {};
const logChannelIds = {
    '197777408198180864': '263385335105323015',
    '329477820076130306': '709178148503420968'
};
const logMemberJoinChannelIds = {
    '197777408198180864': '263385335105323015',
    '329477820076130306': '709178148503420968'
};
const cachedInvites = new Map();
const cachedVanityUses = new Map();
let helpDescription = `\`${prefix}help\`: Provides information about all commands.`;
let _db;
const db = () => _db;
exports.db = db;
const clean = (text) => {
    return text.replace(/`/g, `\`${String.fromCharCode(8203)}`).replace(/@/g, `@${String.fromCharCode(8203)}`).slice(0, 1990);
};
const addFooter = (message, reply) => {
    var _a;
    const author = ((_a = message.member) === null || _a === void 0 ? void 0 : _a.displayName) || message.author.username;
    const embed = reply.embeds[0].setFooter(`Triggered by ${author}`, message.author.displayAvatarURL())
        .setTimestamp(message.createdAt);
    return reply.edit(embed);
};
exports.addFooter = addFooter;
const cacheAllInvites = () => __awaiter(void 0, void 0, void 0, function* () {
    const manageableGuilds = exports.client.guilds.cache
        .filter(guild => guild.me.hasPermission(discord_js_1.Permissions.FLAGS.MANAGE_GUILD))
        .values();
    for (const guild of manageableGuilds) {
        try {
            const invitesCollection = yield guild.fetchInvites();
            const invites = invitesCollection
                .reduce((map, invite) => map.set(invite.code, new CachedInvite(invite)), new Map());
            cachedInvites.set(guild.id, invites);
            if (guild.vanityURLCode) {
                const vanity = yield guild.fetchVanityData();
                cachedVanityUses.set(guild.id, vanity.uses);
            }
        }
        catch (e) {
            console.error(`Unable to store invites for server: ${guild}
Caused by:`, e);
        }
    }
});
const reloadDQTimers = () => __awaiter(void 0, void 0, void 0, function* () {
    yield Promise.all(yield exports.db().collection('dqs').find().map((document) => __awaiter(void 0, void 0, void 0, function* () {
        const { guild, user } = document._id;
        // check if timer has lapsed while the bot was off, and if so free the prisoner
        if (moment_1.default().isSameOrAfter(moment_1.default(document.dqEndTime))) {
            return dq_1.doUnTimeout(guild, user);
        }
        // still time left so just set the timers back up
        moment_1.default.duration(moment_1.default().diff(moment_1.default(document.dqEndTime))).timer({ start: true }, () => dq_1.doUnTimeout(guild, user));
    })).toArray());
});
const restart = () => {
    exports.client.destroy();
    return exports.client.login(token);
};
const handleCommand = (message) => __awaiter(void 0, void 0, void 0, function* () {
    const slice = message.content.indexOf(' ');
    const cmd = message.content.slice(prefix.length, (slice < 0) ? message.content.length : slice).toLowerCase();
    const args = (slice < 0) ? '' : message.content.slice(slice);
    if (commands[cmd]) {
        commands[cmd].execute(message, args).catch(console.error);
    }
    else if (cmd === 'help') {
        const embed = new discord_js_1.MessageEmbed()
            .setColor('RANDOM')
            .setTitle('Commands')
            .setDescription(helpDescription);
        message.channel.send(embed)
            .then(reply => exports.addFooter(message, reply))
            .catch(console.error);
    }
    else if (message.author.id === ownerId) {
        if (cmd === 'eval') {
            try {
                const evaled = /\s*await\s+/.test(args) ? (yield eval(`const f = async () => {\n${args}\n};\nf();`)) : eval(args);
                const evaledString = (typeof evaled === 'string') ? evaled : util_1.inspect(evaled);
                message.channel.send(clean(evaledString), { code: 'xl' }).catch(console.error);
            }
            catch (error) {
                message.channel.send(`\`ERROR\` \`\`\`xl\n${clean(error)}\`\`\``).catch(console.error);
            }
        }
        else if (cmd === 'restart') {
            restart();
        }
    }
});
const logEmbedColor = (action) => {
    switch (action) {
        case 'updated':
            return discord_js_1.Constants.Colors.GREEN;
        case 'deleted':
            return discord_js_1.Constants.Colors.RED;
        case 'bulk deleted':
            return discord_js_1.Constants.Colors.BLUE;
        default:
            return discord_js_1.Constants.Colors.DEFAULT;
    }
};
const userUrl = (id) => `https://discordapp.com/users/${id}`;
exports.userUrl = userUrl;
const log = (message, action) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    if (!message.guild || message.author.bot) {
        return;
    }
    const authorName = ((_a = message.member) === null || _a === void 0 ? void 0 : _a.displayName) || message.author.username;
    const embed = new discord_js_1.MessageEmbed()
        .setColor(logEmbedColor(action))
        .setAuthor(authorName, message.author.displayAvatarURL(), exports.userUrl(message.author.id))
        .setDescription(message.content)
        .setTimestamp(message.createdAt);
    if (message.attachments.size) {
        embed.attachFiles(message.attachments.map(attachment => attachment.proxyURL));
    }
    const logChannel = message.guild.channels.cache.get(logChannelIds[message.guild.id]);
    if (logChannel) {
        const content = ['Message', `${action} in ${message.channel}:\n${message.url}`];
        const logged = yield logChannel.send(content.join(' '), embed);
        content.splice(1, 0, `by ${message.author}`);
        return logged.edit(content.join(' '));
    }
});
const logMemberJoin = (member) => __awaiter(void 0, void 0, void 0, function* () {
    if (!member.guild.me.hasPermission(discord_js_1.Permissions.FLAGS.MANAGE_GUILD)) {
        console.error(`Missing Manage Server permission in server: ${member.guild}`);
        return;
    }
    const invitesCollection = yield member.guild.fetchInvites()
        .catch((e) => {
        console.error(`Failed to fetch invites when logging member join.
Caused by:`, e);
        return new discord_js_1.Collection();
    });
    const newInvites = invitesCollection.reduce((map, invite) => map.set(invite.code, new CachedInvite(invite)), new Map());
    const oldInvites = cachedInvites.get(member.guild.id);
    // invites that had their uses increase
    const usedInvites = Array.from(newInvites.values())
        .filter(newInvite => oldInvites.get(newInvite.code).uses < newInvite.uses);
    if (!usedInvites.length) {
        // invites that reached their max number of uses
        Array.from(oldInvites.values())
            .filter(i => !newInvites.has(i.code) && i.uses === i.maxUses - 1)
            .forEach(invite => usedInvites.push(invite));
    }
    if (!usedInvites.length && member.guild.vanityURLCode) {
        // vanity invite uses
        const vanity = yield member.guild.fetchVanityData();
        if (cachedVanityUses.get(member.guild.id) < vanity.uses) {
            usedInvites.push({
                inviter: member.guild.ownerID,
                code: vanity.code,
                uses: vanity.uses,
                maxUses: 0,
                expiresTimestamp: null,
            });
            cachedVanityUses.set(member.guild.id, vanity.uses);
        }
    }
    if (!usedInvites.length) {
        console.error(`Could not determine invite used for member ${member}
oldInvites: ${JSON.stringify(Array.from(oldInvites))}
newInvites: ${JSON.stringify(Array.from(newInvites))}`);
    }
    cachedInvites.set(member.guild.id, newInvites);
    const logChannelId = logMemberJoinChannelIds[member.guild.id];
    const logChannel = (yield exports.client.channels.fetch(logChannelId));
    const inviteString = usedInvites.map(i => `\`${i.code}\` by <@${i.inviter}>`)
        .join(', or ');
    yield logChannel.send(`Member ${member} joined via invite: ${inviteString}`);
});
exports.client.on(discord_js_1.Constants.Events.CLIENT_READY, () => {
    console.log(`Logged in as ${exports.client.user.tag}`);
    cacheAllInvites().catch(console.error);
    reloadDQTimers().catch(console.error);
    exports.client.user.setPresence({
        status: 'online',
        activity: {
            type: 'PLAYING',
            name: `${prefix}help`
        }
    }).catch(console.error);
    messages.updateGuilds().catch(console.error);
});
exports.client.on(discord_js_1.Constants.Events.CHANNEL_CREATE, channel => {
    if (channel.type === 'text') {
        messages.updateChannel(channel).catch(console.error);
    }
});
exports.client.on(discord_js_1.Constants.Events.GUILD_UPDATE, (oldGuild, newGuild) => {
    if (oldGuild.vanityURLCode !== newGuild.vanityURLCode) {
        cachedVanityUses.set(newGuild.id, newGuild.vanityURLUses);
    }
});
exports.client.on(discord_js_1.Constants.Events.INVITE_CREATE, invite => {
    cachedInvites.get(invite.guild.id)
        .set(invite.code, new CachedInvite(invite));
});
exports.client.on(discord_js_1.Constants.Events.INVITE_DELETE, (invite) => __awaiter(void 0, void 0, void 0, function* () {
    const cachedInvite = cachedInvites.get(invite.guild.id)
        .get(invite.code);
    if (cachedInvite.expiresTimestamp <= Date.now()) {
        cachedInvites.get(invite.guild.id)
            .delete(invite.code);
        return;
    }
    try {
        const inviteDeleteLogs = yield invite.guild.fetchAuditLogs({
            type: discord_js_1.GuildAuditLogs.Actions.INVITE_DELETE,
            limit: 10,
        });
        if (inviteDeleteLogs.entries.some(log => log.changes.some(change => change.key === 'code' && change.old === invite.code))) {
            cachedInvites.get(invite.guild.id)
                .delete(invite.code);
        }
    }
    catch (e) {
        console.error(`Failed to handle delete of invite: ${invite}
Caused by:`, e);
    }
}));
exports.client.on(discord_js_1.Constants.Events.MESSAGE_CREATE, message => {
    var _a;
    const mentionCount = (_a = message.mentions.members) === null || _a === void 0 ? void 0 : _a.size;
    if (mentionCount > 10) {
        message.member.kick(`Mentioned ${mentionCount} users`);
    }
    if (message.content.startsWith(prefix)) {
        handleCommand(message).catch(console.error);
    }
    if (message.guild) {
        messages.upsertMessageInDb(message).catch(console.error);
    }
});
exports.client.on(discord_js_1.Constants.Events.MESSAGE_DELETE, (message) => {
    if (message.guild) {
        log(message, 'deleted').catch(console.error);
        messages.upsertMessageInDb(message, -1).catch(console.error);
    }
});
exports.client.on(discord_js_1.Constants.Events.MESSAGE_UPDATE, (oldMessage, newMessage) => {
    if (oldMessage.guild && oldMessage.content !== newMessage.content) {
        log(oldMessage, 'updated').catch(console.error);
    }
});
exports.client.on(discord_js_1.Constants.Events.MESSAGE_BULK_DELETE, (messageCollection) => {
    messageCollection.forEach(message => {
        if (message.guild) {
            log(message, 'bulk deleted').catch(console.error);
            messages.upsertMessageInDb(message, -1).catch(console.error);
        }
    });
});
exports.client.on(discord_js_1.Constants.Events.DISCONNECT, event => {
    console.error('Disconnect.');
    console.error(JSON.stringify(event));
    restart();
});
exports.client.on(discord_js_1.Constants.Events.ERROR, console.error);
exports.client.on(discord_js_1.Constants.Events.WARN, console.warn);
mongodb_1.MongoClient.connect(dbUri, mongoOptions).then(mongoClient => {
    _db = mongoClient.db('bigbro');
    Object.entries(commandInfo).forEach(([name, desc]) => {
        commands[name.toLowerCase()] = require(`./commands/${name}`).default;
        helpDescription += `\n\`${prefix}${name}\`: ${desc}`;
    });
    const memberVerifier = new verify_1.MemberVerifier(exports.db().collection('members'));
    exports.client.on(discord_js_1.Constants.Events.GUILD_MEMBER_ADD, (member) => {
        logMemberJoin(member)
            .catch((e) => console.error(`Failed to log member join: ${member}
Caused by:`, e));
    });
    exports.client.on(discord_js_1.Constants.Events.GUILD_MEMBER_UPDATE, (oldMember, newMember) => {
        if (oldMember.pending && !newMember.pending) {
            memberVerifier.verify(newMember)
                .catch((e) => console.error(`Failed to verify member: ${newMember}
Caused by:`, e));
        }
    });
    exports.client.on(discord_js_1.Constants.Events.GUILD_MEMBER_REMOVE, (member) => {
        memberVerifier.store(member)
            .catch((e) => console.error(`Failed to store removed member's \
verification info: ${member}
Caused by:`, e));
    });
    exports.client.login(token)
        .catch((e) => console.error('Failed to login\nCaused by:', e));
}).catch(console.error);
//# sourceMappingURL=index.js.map
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
exports.MemberVerifier = void 0;
const axios_1 = __importDefault(require("axios"));
const reApiToken = process.env.BIGBRO_RE_TOKEN;
const reApiBaseUrl = 'https://www.robotevents.com/api/v2';
class Program {
    constructor(name, role, emojiName, emojiId, teamRegExp, teamExamples, ids) {
        this.name = name;
        this.role = role;
        this.emojiName = emojiName;
        this.emojiId = emojiId;
        this.teamRegExp = teamRegExp;
        this.teamExamples = teamExamples;
        this.ids = ids;
    }
    getEmojiIdentifier() {
        return this.emojiId ? `${this.emojiName}:${this.emojiId}` : encodeURIComponent(this.emojiName);
    }
    getEmoji() {
        return this.emojiId ? `<:${this.emojiName}:${this.emojiId}>` : this.emojiName;
    }
}
class MemberVerifier {
    constructor(collection) {
        this.collection = collection;
    }
    verify(member) {
        return __awaiter(this, void 0, void 0, function* () {
            const verifiedMember = yield this.collection.findOne({
                user: member.id,
                guild: member.guild.id
            });
            if (verifiedMember) {
                yield member.setNickname(verifiedMember.nickname, 'Automatic reverification');
                yield member.roles.add(verifiedMember.roles);
                return true;
            }
            const welcomeMessage = `Welcome to the ${member.guild} Discord server!

In order to access all of the server's channels, you must have your name and \
team verified. If you have any issues or questions throughout this process, \
please message a member of the moderation team for help.`;
            try {
                yield member.send(welcomeMessage);
            }
            catch (error) {
                console.warn(`Failed to DM welcome message to user: ${member.user.tag} \
(${member.id})
Caused by:`, error);
                yield member.guild.systemChannel.send(`${member} ${welcomeMessage}

Please send a message here with the following, and a member of the moderation \
team will verify your account shortly:
1. Your name or preferred nickname.
2. The robotics program you are primarily affiliated with. (Examples: \
${MemberVerifier.programNames})
3. Your robotics team's ID#. (Examples: \`44\`, \`5225A\`, \`AURA\`, \`QCC2\`)`);
                return false;
            }
            while (true) {
                const name = yield this.promptForName(member);
                const program = yield this.promptForProgram(member);
                if (program.name === 'Other/None') {
                    const assistanceMessage = yield member.guild.systemChannel.send(`${member} Please send a message here with your name or preferred \
nickname and a brief explanation of how you are affiliated with VEX Robotics \
and/or why you'd like to join the server. Mention a moderator for assistance.`);
                    yield member.send(`A member of the moderation team must manually \
verify your account. Please follow the instructions provided in the message I \
just sent in the ${member.guild} server: ${assistanceMessage.url}`);
                    return false;
                }
                const team = yield this.promptForTeam(member, program);
                const commonProgram = ['VRC', 'VEX U'].includes(program.name);
                const teamString = commonProgram ? team : `${program.name} ${team}`;
                const nickname = `${name}${MemberVerifier.DELIMITER}${teamString}`;
                if (yield this.promptForConfirmation(member, nickname)) {
                    yield member.setNickname(nickname, 'Automatic verification');
                    yield member.roles.add([MemberVerifier.VERIFIED_ROLE, program.role]);
                    const verifiedChannelId = MemberVerifier.verifiedChannelIds[member.guild.id];
                    const verifiedChannel = member.guild.channels.resolve(verifiedChannelId);
                    const verifiedMessage = yield verifiedChannel.send(`${member} Welcome!`);
                    yield member.send(`Congratulations! You now have access to the other \
channels of the ${member.guild} server! Say hello here: ${verifiedMessage.url}`);
                    return true;
                }
            }
        });
    }
    store(member) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!member.nickname || member.roles.cache.size === 1) {
                return;
            }
            const verifiedMember = {
                user: member.id,
                guild: member.guild.id,
                nickname: member.nickname,
                roles: member.roles.cache.keyArray()
            };
            yield this.collection.updateOne({
                user: verifiedMember.user,
                guild: verifiedMember.guild
            }, {
                $set: verifiedMember
            }, {
                upsert: true
            });
        });
    }
    promptForName(member) {
        return __awaiter(this, void 0, void 0, function* () {
            while (true) {
                yield member.send('1. What is your name or preferred nickname?');
                const responses = yield member.user.dmChannel
                    .awaitMessages((message) => message.author.id === member.id, {
                    max: 1
                });
                const name = responses.first().cleanContent.trim();
                if (name.length < 1) {
                    yield member.send('Sorry, names/nicknames must contain at least 1 \
non-whitespace character.');
                    continue;
                }
                if (name.length > MemberVerifier.NAME_LENGTH_MAX) {
                    yield member.send(`Sorry, names/nicknames must be \
${MemberVerifier.NAME_LENGTH_MAX} or fewer characters in length.`);
                    continue;
                }
                if (!/^[ -{}~]*$/.test(name)) {
                    yield member.send('Sorry, names/nicknames may only contain the \
following non-alphanumeric characters: `` !"#$%&\'()*+,-./:;<=>?@[\\]^_`{}~``');
                    continue;
                }
                return name;
            }
        });
    }
    promptForProgram(member) {
        return __awaiter(this, void 0, void 0, function* () {
            const prompt = yield member.send(`2. Select the reaction corresponding to \
the robotics program you are primarily affiliated with.
${MemberVerifier.programChoices}`);
            const reactionsPromise = prompt.awaitReactions((reaction, user) => {
                return MemberVerifier.programEmojis.includes(reaction.emoji.identifier)
                    && user.id === member.id;
            }, {
                max: 1
            });
            for (const programEmoji of MemberVerifier.programEmojis) {
                yield prompt.react(programEmoji);
            }
            const reactions = yield reactionsPromise;
            return MemberVerifier.emojiToProgram.get(reactions.first().emoji.identifier);
        });
    }
    promptForTeam(member, program) {
        return __awaiter(this, void 0, void 0, function* () {
            while (true) {
                yield member.send(`3. What is your ${program.name} team's ID#? (For \
example: ${program.teamExamples.map(team => `\`${team}\``).join(', ')})`);
                const responses = yield member.user.dmChannel
                    .awaitMessages((message) => message.author.id === member.id, {
                    max: 1
                });
                const team = responses.first().cleanContent.trim();
                if (!program.teamRegExp.test(team)) {
                    yield member.send(`Sorry, that is not a valid ${program.name} team \
ID#. Please double-check your ${program.name} team ID# or message a member of \
the moderation team for help.`);
                    continue;
                }
                if (!program.ids) {
                    return team;
                }
                const programs = program.ids.map(id => `program[]=${id}`).join('&');
                const url = `${reApiBaseUrl}/teams?${programs}&number[]=${team}`;
                const { data: { data: teams } } = yield axios_1.default.get(url, {
                    headers: {
                        Authorization: `Bearer ${reApiToken}`
                    }
                });
                if (!teams.length) {
                    yield member.send(`Sorry, the ${program.name} team \`${team}\` has \
never been registered. Please double-check your ${program.name} team ID# or \
message a member of the moderation team for help.`);
                    continue;
                }
                return teams[0].number;
            }
        });
    }
    promptForConfirmation(member, nickname) {
        return __awaiter(this, void 0, void 0, function* () {
            const confirmation = yield member.send(`Your nickname in the \
${member.guild} server will be set to \
\`\`${nickname.replace(/`/g, '`\u200b')}\`\`, is that correct?
(Select the reaction corresponding to your answer.)
> ${MemberVerifier.YES}: Yes
> ${MemberVerifier.NO}: No`);
            const reactionsPromise = confirmation.awaitReactions((reaction, user) => {
                return MemberVerifier.confirmationEmojis.includes(reaction.emoji.name)
                    && user.id === member.id;
            }, {
                max: 1
            });
            for (const confirmationEmoji of MemberVerifier.confirmationEmojis) {
                yield confirmation.react(confirmationEmoji);
            }
            const reactions = yield reactionsPromise;
            return (reactions.first().emoji.name === MemberVerifier.YES);
        });
    }
}
exports.MemberVerifier = MemberVerifier;
MemberVerifier.NAME_LENGTH_MAX = 25;
MemberVerifier.DELIMITER = '│';
MemberVerifier.VERIFIED_ROLE = '260524994646376449';
MemberVerifier.verifiedChannelIds = {
    '197777408198180864': '260546095082504202',
    '329477820076130306': '709178148503420968'
};
MemberVerifier.programs = [
    new Program('VRC', '197836716726288387', 'vrc', '464676956428828682', /^[0-9]{1,5}[A-Z]?$/i, ['44', '5225A'], [1]),
    new Program('VEX U', '305392771324313610', 'vexu', '464677474509389831', /^[A-Z]{2,5}[0-9]{0,2}$/i, ['AURA', 'QCC2'], [4]),
    new Program('VAIC', '706299363588177940', 'vaic', '811072718274691073', /^([0-9]{1,5}[A-Z]?|[A-Z]{2,5}[0-9]{0,2})$/i, ['8059A', 'WPI1'], [48, 49]),
    new Program('VIQC', '197817210729791489', 'viqc', '464677535461146624', /^[0-9]{1,5}[A-Z]?$/i, ['42292B', '15472A'], [41]),
    new Program('FRC', '263900951738318849', 'frc', '810644445192126525', /^[0-9]{1,4}$/, ['254', '1114']),
    new Program('FTC', '263900951738318849', 'ftc', '810644782215987230', /^[0-9]{1,5}$/, ['724', '11115']),
    new Program('Other/None', '197817210729791489', '❓')
];
MemberVerifier.programNames = MemberVerifier.programs
    .map(program => `\`${program.name}\``)
    .join(', ');
MemberVerifier.programChoices = MemberVerifier.programs
    .map(program => `> ${program.getEmoji()}: ${program.name}`)
    .join('\n');
MemberVerifier.emojiToProgram = MemberVerifier.programs
    .reduce((map, program) => map.set(program.getEmojiIdentifier(), program), new Map());
MemberVerifier.programEmojis = [...MemberVerifier.emojiToProgram.keys()];
MemberVerifier.YES = '✅';
MemberVerifier.NO = '❎';
MemberVerifier.confirmationEmojis = [MemberVerifier.YES, MemberVerifier.NO];
var Grade;
(function (Grade) {
    Grade["COLLEGE"] = "College";
    Grade["HIGH_SCHOOL"] = "High School";
    Grade["MIDDLE_SCHOOL"] = "Middle School";
    Grade["ELEMENTARY_SCHOOL"] = "Elementary School";
})(Grade || (Grade = {}));
//# sourceMappingURL=verify.js.map
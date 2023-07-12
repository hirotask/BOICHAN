//必要なパッケージをインポートする
import { GatewayIntentBits, Client, Partials, Events, EmbedBuilder, Message, Snowflake } from 'discord.js'
import dotenv from 'dotenv'
import { SpeechEvents, addSpeechEvent, resolveSpeechWithGoogleSpeechV2 } from 'discord-speech-recognition'
import { VoiceConnection, joinVoiceChannel } from '@discordjs/voice'

//.envファイルを読み込む
dotenv.config()

//Botで使うGetwayIntents、partials
const client = new Client({
    intents: [
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildVoiceStates
    ],
    partials: [Partials.Message, Partials.Channel],
})

const connect_commands = ["議事録取って", "議事録開始", "!start"];
const stop_commands = ["議事録とめて", "議事録終了", "!stop"];

//Botがきちんと起動したか確認
client.once('ready', () => {
    console.log('Ready!')
    if (client.user) {
        console.log(client.user.tag)
    }
})

addSpeechEvent(client, {
    lang: "ja-JP",
    speechRecognition: resolveSpeechWithGoogleSpeechV2,
    ignoreBots: true,
    minimalVoiceMessageDuration: 1,
});

let voiceConnections = new Map<Snowflake, VoiceConnection>();

client.on(Events.MessageCreate, (message: Message) => {
    if (message.author.bot) return

    if (connect_commands.includes(message.content)) {
        if (message.member && message.member?.voice.channel) {
            const voiceChannel = message.member.voice.channel;
            const connection = joinVoiceChannel({
                channelId: voiceChannel.id,
                guildId: voiceChannel.guild.id,
                adapterCreator: voiceChannel.guild.voiceAdapterCreator,
                selfDeaf: false,
            });

            voiceConnections.set(voiceChannel.guild.id, connection);

            message.channel.send("文字起こしを開始します")

        } else {
            message.channel.send("ボイスチャンネルに接続してください")
        }
    } else if (stop_commands.includes(message.content)) {
        if (message.member && message.member.voice.channel) {
            const voiceChannel = message.member.voice.channel;
            const connection = voiceConnections.get(voiceChannel.guild.id)

            if (connection) {
                message.channel.send("文字起こしを終了します")
                connection.disconnect()
                voiceConnections.delete(voiceChannel.guild.id)
            }
        } else {
            message.channel.send("BOICHANはボイスチャンネルに接続していません")
        }
    }
})


client.on(SpeechEvents.speech, (msg) => {
    // If bot didn't recognize speech, content will be empty
    if (!msg.content) return;

    const embedMsg = new EmbedBuilder()
        .setColor(0x0099FF)
        .setAuthor({ name: msg.author.username, iconURL: msg.author.avatarURL() })
        .setDescription(msg.content)

    msg.channel.send({ embeds: [embedMsg] });
});

//ボット作成時のトークンでDiscordと接続
client.login(process.env.TOKEN)

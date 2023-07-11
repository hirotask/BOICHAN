//必要なパッケージをインポートする
import { GatewayIntentBits, Client, Partials, Events, EmbedBuilder } from 'discord.js'
import { joinVoiceChannel } from '@discordjs/voice'
import dotenv from 'dotenv'
import { SpeechEvents, addSpeechEvent, resolveSpeechWithGoogleSpeechV2 } from 'discord-speech-recognition'

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

client.on(Events.MessageCreate, (msg) => {
    const voiceChannel = msg.member?.voice.channel;
    if (voiceChannel) {
        joinVoiceChannel({
            channelId: voiceChannel.id,
            guildId: voiceChannel.guild.id,
            adapterCreator: voiceChannel.guild.voiceAdapterCreator,
            selfDeaf: false,
        });


    }
});

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

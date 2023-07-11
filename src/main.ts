//必要なパッケージをインポートする
import { GatewayIntentBits, Client, Partials, Message, Snowflake, Embed, Attachment, AttachmentBuilder } from 'discord.js'
import { joinVoiceChannel, VoiceConnection, createAudioPlayer, EndBehaviorType, VoiceReceiver, AudioReceiveStream, createAudioResource, StreamType } from '@discordjs/voice'
import dotenv from 'dotenv'
import { writeFileSync, createWriteStream, unlinkSync } from 'fs'
import { VoiceRecorder } from '@kirdock/discordjs-voice-recorder'

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

let voiceConnections = new Map<Snowflake, VoiceConnection>();
const SILENCE_BUFFER = Buffer.from([0xf8, 0xff, 0xfe]);

const start_commands = ["議事録取って", "議事録開始", "!start"];
const stop_commands = ["議事録とめて", "議事録終了", "!stop"];

const voiceRecorder = new VoiceRecorder();

//!timeと入力すると現在時刻を返信するように
client.on('messageCreate', async (message: Message) => {
    if (message.author.bot) return

    if (start_commands.includes(message.content)) {
        if (message.member && message.member.voice.channel) {
            const voiceChannel = message.member.voice.channel;
            const connection = joinVoiceChannel({
                channelId: voiceChannel.id,
                guildId: voiceChannel.guild.id,
                adapterCreator: voiceChannel.guild.voiceAdapterCreator,
                selfDeaf: false
            });

            connection.playOpusPacket(SILENCE_BUFFER)
            voiceConnections.set(voiceChannel.guild.id, connection);
            message.channel.send(`${voiceChannel.name}に接続しました`);

            const player = createAudioPlayer();
            //プレイヤーを音声接続オブジェクトに接続する
            connection.subscribe(player);

            message.channel.send('録音を開始します')
            voiceRecorder.startRecording(connection);
        } else {
            message.channel.send("ボイスチャンネルに接続してください");
        }
    } else if (stop_commands.includes(message.content)) {
        if (message.member && message.member.voice.channel) {
            const voiceChannel = message.member.voice.channel;
            const connection = voiceConnections.get(voiceChannel.guild.id);
            if (connection) {

                const fileName = './rec/'.concat(Date.now().toString(), '-').concat(message.member.user.id, '.mp3')
                const out = createWriteStream(fileName)

                await voiceRecorder.getRecordedVoice(out, message.member.guild.id, "single", 5);

                voiceRecorder.stopRecording(connection);

                // message.channel.send({
                //     content: "This is your voice",
                //     files: [{
                //         attachment: out,
                //         contentType: "audio/mp3",
                //         name: "output.mp3"
                //     }]
                // })

                connection.disconnect();
                voiceConnections.delete(voiceChannel.guild.id);
                message.channel.send(`${voiceChannel.name}から切断しました`);
            }
        }
    } else if (message.content === '!time') {
        const date1 = new Date();
        message.channel.send(date1.toLocaleString());
    }

})


//ボット作成時のトークンでDiscordと接続
client.login(process.env.TOKEN)

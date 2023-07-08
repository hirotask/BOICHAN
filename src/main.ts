//必要なパッケージをインポートする
import { GatewayIntentBits, Client, Partials, Message, Snowflake } from 'discord.js'
import { joinVoiceChannel, VoiceConnection, createAudioPlayer, EndBehaviorType } from '@discordjs/voice'
import dotenv from 'dotenv'

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

            const receiver = connection.receiver;

            receiver.speaking.on("start", (userId) => {
                const audioStream = receiver.subscribe(userId, {
                    end: {
                        behavior: EndBehaviorType.AfterSilence,
                        duration: 10
                    }
                });
                //TODO: 音声を取得して、WAV形式に変換する
                //TODO: WAV形式の音声をWhisperAPIに送信する
            });
        } else {
            message.channel.send("ボイスチャンネルに接続してください");
        }
    } else if (stop_commands.includes(message.content)) {
        if (message.member && message.member.voice.channel) {
            const voiceChannel = message.member.voice.channel;
            const connection = voiceConnections.get(voiceChannel.guild.id);
            if (connection) {
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

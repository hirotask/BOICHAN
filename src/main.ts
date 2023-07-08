//必要なパッケージをインポートする
import { GatewayIntentBits, Client, Partials, Message, Snowflake, User } from 'discord.js'
import { joinVoiceChannel, VoiceConnection, createAudioPlayer, EndBehaviorType, VoiceReceiver, AudioReceiveStream, createAudioResource, StreamType } from '@discordjs/voice'
import { OpusEncoder } from '@discordjs/opus'
import dotenv from 'dotenv'
import * as WavEncoder from 'wav-encoder'
import { writeFileSync } from 'fs'
import { PassThrough } from 'stream'
import * as Prism from 'prism-media'

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
                // const audioStream = receiver.subscribe(userId, {
                //     end: {
                //         behavior: EndBehaviorType.AfterSilence,
                //         duration: 10
                //     }
                // });

                const opusStream = receiver.subscribe(userId, {
                    end: {
                        behavior: EndBehaviorType.AfterSilence,
                        duration: 100
                    }
                })
                message.channel.send('録音を開始します')

                const rawStream = new PassThrough()

                opusStream.pipe(new Prism.opus.Decoder({ rate: 48000, channels: 2, frameSize: 960 })).pipe(rawStream)

                // const leftOpusStream: Promise<Buffer>[] = [];
                // const rightOpusStream: Promise<Buffer>[] = [];

                // let isLeftChannel = true; // 初めは左チャンネル

                // opusStream.on('data', (chunk) => {

                //     const decodedChunk = decodeOpus(chunk);

                //     if (isLeftChannel) {
                //         leftOpusStream.push(decodedChunk);
                //     } else {
                //         rightOpusStream.push(decodedChunk);
                //     }

                //     isLeftChannel = !isLeftChannel; // チャンネルを切り替える
                // });

                opusStream.on('end', async () => {
                    console.log(`Stream from user ${userId} has ended`);

                    const resource = createAudioResource(rawStream, {
                        inputType: StreamType.Raw
                    })
                    player.play(resource)

                    // const leftPcmDataArray = await Promise.all(leftOpusStream);
                    // const leftConcatenatedBuffer = Buffer.concat(leftPcmDataArray);
                    // const rightPcmDataArray = await Promise.all(rightOpusStream);
                    // const rightConcatenatedBuffer = Buffer.concat(rightPcmDataArray);

                    // const fileName = './rec/'.concat(Date.now().toString(), '-').concat(userId, '.wav')

                    // const arr1 = new Float32Array(leftConcatenatedBuffer.buffer);
                    // const arr2 = new Float32Array(rightConcatenatedBuffer.buffer);
                    // const data = {
                    //     sampleRate: 4800,
                    //     channels: 2,
                    //     channelData: [arr1, arr2]
                    // }

                    // WavEncoder.encode(data).then((buffer) => {
                    //     writeFileSync(fileName, Buffer.from(buffer), { encoding: "binary" })
                    // })
                })

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

async function decodeOpus(opusStream: Buffer): Promise<Buffer> {
    //OpusからPCMへ変換をする
    return new Promise((resolve, reject) => {
        const opusDecoder = new OpusEncoder(48000, 2);
        const pcmData = opusDecoder.decode(opusStream);
        resolve(pcmData);
    });
}

//ボット作成時のトークンでDiscordと接続
client.login(process.env.TOKEN)

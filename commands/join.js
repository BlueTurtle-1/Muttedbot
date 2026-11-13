import { SlashCommandBuilder } from 'discord.js';
import { ensureConnection } from '../music/player.js';
import { getQueue, deleteQueue } from '../music/queue.js';

export const data = new SlashCommandBuilder()
  .setName('join')
  .setDescription('Join your voice channel');

export async function execute(interaction) {
  const vc = interaction.member.voice?.channel;
  
  if (!vc) {
    return interaction.reply({ content: '❌ Join a voice channel first.', ephemeral: true });
  }

  const q = getQueue(interaction.guild.id);

  // 👇 If the bot is already connected to a different channel, destroy it first
  if (q.connection && q.connection.joinConfig.channelId !== vc.id) {
    console.log(`🔄 Moving bot from <#${q.connection.joinConfig.channelId}> to <#${vc.id}>`);
    
    // Stop playback and cleanup
    q.player?.stop();
    q.connection.destroy();
    
    // Reset the queue state so it can connect to the new channel
    deleteQueue(interaction.guild.id);
  }

  // Create the new connection (or use the existing one if already in this channel)
  ensureConnection(interaction.guild, vc, interaction.channel);
  
  return interaction.reply(`✅ Joined **${vc.name}**.`);
}
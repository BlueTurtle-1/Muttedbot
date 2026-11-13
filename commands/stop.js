import { SlashCommandBuilder } from 'discord.js';
import { getQueue } from '../music/queue.js';

export const data = new SlashCommandBuilder().setName('stop').setDescription('Stop playback and clear the queue');

export async function execute(interaction) {
  const q = getQueue(interaction.guild.id);
  
  if (!q.connection) {
    return interaction.reply({ content: '❌ I am not in a voice channel.', ephemeral: true });
  }

  q.clear(); // Clears the queue
  q.player?.stop(); // Stops the current song
  
  return interaction.reply('⏹️ Stopped playback and cleared the queue.');
}
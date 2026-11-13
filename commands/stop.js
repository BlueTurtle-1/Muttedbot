import { SlashCommandBuilder } from 'discord.js';
import { stopAndLeave } from '../music/player.js';

export const data = new SlashCommandBuilder().setName('stop').setDescription('Stop playback and leave');

export async function execute(interaction) {
  stopAndLeave(interaction.guild.id);
  return interaction.reply('⏹️ Stopped and left the channel.');
}
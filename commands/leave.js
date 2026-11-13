import { SlashCommandBuilder } from 'discord.js';
import { stopAndLeave } from '../music/player.js';

export const data = new SlashCommandBuilder().setName('leave').setDescription('Leave the voice channel');

export async function execute(interaction) {
  stopAndLeave(interaction.guild.id);
  return interaction.reply('👋 Left the voice channel.');
}
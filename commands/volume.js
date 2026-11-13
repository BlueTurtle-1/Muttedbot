import { SlashCommandBuilder } from 'discord.js';
import { setVolume } from '../music/player.js';

export const data = new SlashCommandBuilder()
  .setName('volume')
  .setDescription('Set playback volume (0-100)')
  .addIntegerOption((opt) =>
    opt.setName('level').setDescription('0-100').setRequired(true).setMinValue(0).setMaxValue(100)
  );

export async function execute(interaction) {
  const level = interaction.options.getInteger('level');
  setVolume(interaction.guild.id, level);
  return interaction.reply(`🔊 Volume set to ${level}%.`);
}
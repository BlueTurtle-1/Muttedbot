import { SlashCommandBuilder } from 'discord.js';
import { searchTrack } from '../music/search.js';
import { getQueue } from '../music/queue.js';

export const data = new SlashCommandBuilder()
  .setName('insert')
  .setDescription('Insert a song at the top of the queue (bypassing the rest)')
  .addStringOption((opt) =>
    opt.setName('song').setDescription('Song name').setRequired(true)
  )
  .addStringOption((opt) =>
    opt.setName('artist').setDescription('Artist name').setRequired(false)
  );

export async function execute(interaction) {
  const song = interaction.options.getString('song');
  const artist = interaction.options.getString('artist');
  const query = artist ? `${song} ${artist}` : song;

  const member = interaction.member;
  const voiceChannel = member.voice?.channel;

  if (!voiceChannel) {
    return interaction.reply({ content: '❌ You need to be in a voice channel.', ephemeral: true });
  }

  await interaction.deferReply();

  const track = await searchTrack(query, member.user.username);
  if (!track) {
    return interaction.editReply(`❌ No results found for "${query}".`);
  }

  const q = getQueue(interaction.guild.id);

  // If nothing is playing, just start playing it normally
  if (!q.current) {
    // We'll import this dynamically to avoid circular dependencies if any
    const { enqueueAndPlay } = await import('../music/player.js');
    const added = await enqueueAndPlay(interaction.guild, voiceChannel, interaction.channel, track);
    if (!added) return interaction.editReply('❌ The queue is full. Try again after a track finishes.');
    return interaction.editReply(`🔎 Started playing: **${track.title}**`);
  }

  // If a song IS playing, insert it at the front of the queue (index 0)
  if (!q.add(track, { front: true })) {
    return interaction.editReply('❌ The queue is full. Try again after a track finishes.');
  }
  return interaction.editReply(`⬆️ Inserted to play next: **${track.title}**`);
}
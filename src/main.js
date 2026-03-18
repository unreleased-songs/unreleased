import { argv } from 'node:process';
import { readFileSync, writeFileSync, mkdirSync, existsSync, cpSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from '@iarna/toml';
import id3 from 'node-id3';

const input = argv[2];
const output = argv[3];

if (!existsSync(output)) mkdirSync(output);

const info = parse(readFileSync(join(input, '_index.toml'), 'utf8'));

let html = readFileSync(join(argv[1], 'src', 'index.html'), 'utf8');

html = html.replaceAll('__TITLE__', info.title ?? (info.artist + ' track collection'));
html = html.replace('__DESCRIPTION__', info.description ?? '');
html = html.replace('__LINK__', info.link ?? 'about:blank');
html = html.replace('__PRETTYLINK__', info.link?.replace('http://', '').replace('https://', '') ?? '');

let content = '';

for (const albumId in info.albums) {
  const path = join(input, info.albums[albumId]);

  const albumInfo = parse(readFileSync(join(path, '_album.toml'), 'utf8'));

  content += '<ul id="' + albumId + '" data-downloadurl="' + albumInfo.title + '">';

  content += '<h2>' + albumInfo.title + ' <a href="#' + albumId + '" class="show">show</a> <a href="#" class="hide">hide</a> <a class="download">download</a></h2>'

  const tracks = readdirSync(path).filter(name => ['mp3', 'm4a', 'wav', 'flac', 'ogg', 'aac'].includes(name.split('.').pop()));

  for (const file of tracks) {
    const tags = id3.read(readFileSync(join(path, file)));

    const name = file.split('.').slice(0, -1).join('.');
    const downloadName = (tags.title ?? name) + '.' + file.split('.').slice(-1)[0];

    content += '<li><a href="' + (info.url ?? './') + encodeURIComponent(info.albums[albumId]) + '/' + encodeURIComponent(file) + '" data-downloadurl="' + albumInfo.title + '/' + downloadName + '" download="' + downloadName + '">';

    content += '<h3>' + (tags.title ?? name) + '</h3>';

    const artists = tags.artist ? tags.artist.split('/') : [];
    if (!artists.includes(info.artist)) artists.unshift(info.artist);

    content += '<p>' + artists.join(', ') + '</p>';

    content += '</a></li>';
  }

  content += '</ul>';
}

html = html.replace('__CONTENT__', content);

writeFileSync(join(output, 'index.html'), html, 'utf8');
cpSync(join(input, info.image), join(output, 'image.jpg')); // the file extension may be wrong, but the browser will render it anyway.
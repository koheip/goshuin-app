// アプリ内の「ライセンス」画面に出す、オープンソースソフトウェアの一覧を作る。
// 使い方：npm run licenses（ライブラリを足したり更新したりしたあとに実行し、src/legal/licenses.json をコミットする）
//
// package-lock.json にある本番用のパッケージを対象にする（開発用と、OSごとの任意のパッケージは除く）。
// アプリに入らないビルド用の道具も含まれるが、載せすぎるぶんには問題ない

import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outFile = join(root, 'src', 'legal', 'licenses.json');

// 短くて文面が決まっているライセンスは、ここに本文を持つ（著作権表示はパッケージごとに並べる）
const STANDARD_TEXTS = {
  MIT: `Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.`,
  ISC: `Permission to use, copy, modify, and/or distribute this software for any purpose with or without fee is hereby granted, provided that the above copyright notice and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.`,
  '0BSD': `Permission to use, copy, modify, and/or distribute this software for any purpose with or without fee is hereby granted.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.`,
  'BSD-2-Clause': `Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:

1. Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.

2. Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.`,
  'BSD-3-Clause': `Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:

1. Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.

2. Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.

3. Neither the name of the copyright holder nor the names of its contributors may be used to endorse or promote products derived from this software without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.`,
};

function readJson(file) {
  return JSON.parse(readFileSync(file, 'utf8'));
}

function licenseFileText(dir) {
  const name = readdirSync(dir).find((f) => /^(licen[sc]e|copying)/i.test(f));
  return name ? readFileSync(join(dir, name), 'utf8').replace(/\r\n/g, '\n').trim() : '';
}

// ライセンスの文面から、著作権表示の行だけを取り出す
function copyrightLines(text) {
  return text
    .split('\n')
    .map((line) => line.replace(/^[\s#*>/-]+/, '').trim())
    .filter((line) => /^(Copyright\s+(\(c\)|©|\d)|\(c\)\s*\d|©)/i.test(line))
    .map((line) => line.slice(0, 200))
    .slice(0, 4);
}

function authorName(pkg) {
  const author = typeof pkg.author === 'string' ? pkg.author : pkg.author?.name;
  return author ? author.replace(/\s*[<(].*$/, '').trim() : '';
}

const lock = readJson(join(root, 'package-lock.json'));

// ライセンスの種類 → パッケージ名 → 著作権表示
const groups = new Map();
// ライセンスの種類 → いちばん長い文面（本文をここに持っていない種類で使う）
const fileTexts = new Map();

for (const [path, entry] of Object.entries(lock.packages)) {
  if (!path || entry.dev || entry.devOptional || entry.optional || entry.link) continue;
  const dir = join(root, path);
  if (!existsSync(join(dir, 'package.json'))) continue;

  const pkg = readJson(join(dir, 'package.json'));
  const rawLicense = entry.license ?? pkg.license;
  const license = typeof rawLicense === 'string' ? rawLicense.replace(/^\((.*)\)$/, '$1') : '不明';
  const text = licenseFileText(dir);
  const author = authorName(pkg);
  const notices = copyrightLines(text);
  if (notices.length === 0 && author) notices.push(`Copyright (c) ${author}`);

  if (!groups.has(license)) groups.set(license, new Map());
  const packages = groups.get(license);
  if (!packages.has(pkg.name)) packages.set(pkg.name, new Set());
  for (const notice of notices) packages.get(pkg.name).add(notice);

  if (text.length > (fileTexts.get(license)?.length ?? 0)) fileTexts.set(license, text);
}

const sections = [...groups.entries()]
  .sort((a, b) => b[1].size - a[1].size || a[0].localeCompare(b[0]))
  .map(([license, packages]) => {
    const list = [...packages.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([name, notices]) => [name, ...[...notices].map((notice) => `  ${notice}`)].join('\n'))
      .join('\n');
    const text = STANDARD_TEXTS[license] ?? fileTexts.get(license) ?? '';
    return { title: `${license}（${packages.size}件）`, lines: [list, ...(text ? [text] : [])] };
  });

writeFileSync(outFile, `${JSON.stringify(sections, null, 2)}\n`);
const total = [...groups.values()].reduce((sum, packages) => sum + packages.size, 0);
console.log(`${total} 件のパッケージ、${sections.length} 種類のライセンスを書き出しました: ${outFile}`);

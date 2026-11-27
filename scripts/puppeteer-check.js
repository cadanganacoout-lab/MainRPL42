const puppeteer = require('puppeteer');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const chromeCandidates = [
  process.env.CHROME_PATH,
  process.platform === 'win32' ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' : null,
  process.platform === 'win32' ? 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe' : null,
  process.platform === 'darwin' ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' : null,
  process.platform === 'linux' ? '/usr/bin/google-chrome' : null,
  process.platform === 'linux' ? '/usr/bin/chromium' : null
].filter(Boolean);
const systemBrowser = chromeCandidates.find(candidate => fs.existsSync(candidate));
const ROOT_DIR = path.resolve(__dirname, '..');
const REPORT_DIR = path.join(ROOT_DIR, 'reports');
const SCREENSHOT_DIR = path.join(REPORT_DIR, 'screenshots');
const routes = ['beranda','siswa','guru','galeri','video','komentar'];
const results = [];
const wait = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));
async function waitForInitialLoading(page) {
  await page.waitForFunction(
    () => !document.querySelector('.initial-loading-screen'),
    {timeout: 10000}
  );
}
const browserCards = [
  {id: 's01', slug: 'browser-student-one', nama: 'Browser Student One', jabatan: 'Ketua Kelas', facts: [], foto: '', sortOrder: 1},
  {id: 's02', slug: 'browser-student-two', nama: 'Browser Student Two', jabatan: 'Siswa', facts: [], foto: '', sortOrder: 2}
];
const browserTeachers = [
  {id: 'g01', nama: 'Browser Teacher One', mapel: 'Pemrograman', role: 'Guru Teori', foto: '', sortOrder: 1},
  {id: 'g02', nama: 'Browser Teacher Two', mapel: 'Basis Data', role: 'Guru Teori', foto: '', sortOrder: 2}
];
const browserPhotos = Array.from({length: 10}, (_, index) => ({
  id: `browser-photo-${index + 1}`,
  caption: `Foto database ${index + 1}`,
  url: `https://images.example.test/photos/${index + 1}.svg`,
  sortOrder: index + 1
}));
const browserVideos = Array.from({length: 9}, (_, index) => ({
  id: `v${String(index + 1).padStart(2, '0')}`,
  judul: `Browser Video ${index + 1}`,
  deskripsi: 'Fixture browser test',
  youtubeId: 'dQw4w9WgXcQ',
  sortOrder: index + 1
}));
const browserAgendaDays = Object.fromEntries(
  ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'].map(day => [day, [
    {mulai: '08:00', selesai: '08:45', mapel: 'Pemrograman', teacherId: 'g01'},
    {text: 'Catatan jadwal kelas tanpa rentang waktu untuk menguji tampilan agenda.'}
  ]])
);
const browserAgendaDuties = Object.fromEntries(
  ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'].map(day => [day, [
    {studentId: 's01'}
  ]])
);
const browserAgenda = {
  schedule: {ganjil: browserAgendaDays, genap: browserAgendaDays},
  duties: browserAgendaDuties
};
const browserAdminStudents = Array.from({length: 6}, (_, index) => ({
  id: `admin-s${String(index + 1).padStart(2, '0')}`,
  nama: `Admin Student ${index + 1}`,
  jabatan: index === 0 ? 'Ketua Kelas' : 'Siswa',
  facts: [],
  foto: '',
  isPublished: true
}));
const browserAdminTeachers = Array.from({length: 4}, (_, index) => ({
  id: `admin-g${String(index + 1).padStart(2, '0')}`,
  nama: `Admin Teacher ${index + 1}`,
  mapel: 'Pemrograman',
  role: 'Guru Teori',
  foto: '',
  isActive: true
}));
const browserAdminGallery = Array.from({length: 4}, (_, index) => ({
  id: `admin-photo-${index + 1}`,
  caption: `Foto admin ${index + 1}`,
  url: `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='9'%3E%3Crect width='16' height='9' fill='%2373c9b2'/%3E%3C/svg%3E`,
  isPublished: true,
  sortOrder: index + 1
}));
const browserAdminVideos = Array.from({length: 4}, (_, index) => ({
  id: `admin-v${String(index + 1).padStart(2, '0')}`,
  judul: `Video admin ${index + 1}`,
  deskripsi: 'Fixture browser test',
  youtubeId: 'dQw4w9WgXcQ',
  isActive: true
}));
const browserAdminAgendaDays = Object.fromEntries(
  ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'].map(day => [day, Array(15).fill(null)])
);
const browserAdminAgenda = {
  classId: 'class-01',
  className: 'XI RPL',
  academicYear: '2025/2026',
  schedule: {
    ganjil: browserAdminAgendaDays,
    genap: browserAdminAgendaDays
  },
  duties: browserAdminAgendaDays
};

async function mockSiteApi(page, {galleryDelay = 0, imageDelay = 0} = {}) {
  await page.setRequestInterception(true);
  page.on('request', async request => {
    const pathname = new URL(request.url()).pathname;
    if (pathname === '/api/auth/me') {
      return request.respond({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({user: null})
      });
    }
    if (pathname === '/api/cards') {
      return request.respond({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({cards: browserCards})
      });
    }
    if (pathname === '/api/teachers') {
      return request.respond({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({teachers: browserTeachers})
      });
    }
    if (pathname === '/api/videos') {
      return request.respond({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({videos: browserVideos})
      });
    }
    if (pathname === '/api/dashboard/summary') {
      return request.respond({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({students: 2, teachers: 2, photos: 10, videos: 9})
      });
    }
    if (pathname === '/api/agenda') {
      return request.respond({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({agenda: browserAgenda})
      });
    }
    if (pathname === '/api/gallery') {
      if (galleryDelay) await wait(galleryDelay);
      return request.respond({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({photos: browserPhotos})
      });
    }
    if (request.url().startsWith('https://images.example.test/photos/')) {
      if (imageDelay) await wait(imageDelay);
      const color = ['#e5a84b', '#73c9b2', '#a795f5', '#e78ba1'][Number(pathname.match(/\d+/)?.[0] || 1) % 4];
      return request.respond({
        status: 200,
        contentType: 'image/svg+xml',
        body: `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="900" viewBox="0 0 16 9"><rect width="16" height="9" fill="${color}"/></svg>`
      });
    }
    return request.continue();
  });
}

(async () => {
  const { createServer } = await import('vite');
  const viteServer = await createServer({
    configFile: path.join(ROOT_DIR, 'vite.config.js'),
    logLevel: 'error',
    server: {
      host: '127.0.0.1',
      port: 0,
      watch: { ignored: ['**/*credentials*.env'] }
    }
  });
  await viteServer.listen();
  const address = viteServer.httpServer.address();
  if (!address || typeof address === 'string') {
    await viteServer.close();
    throw new Error('Could not determine the Vite preview server address.');
  }

  let browser;
  try {
    browser = await puppeteer.launch({
      ...(systemBrowser ? {executablePath: systemBrowser} : {}),
      args: ['--no-sandbox','--disable-setuid-sandbox']
    });
    for (const route of routes) {
      const file = path.join(ROOT_DIR, "index.html");
      if (!fs.existsSync(file)) continue;
      const page = await browser.newPage();
      await page.setViewport({width: 1027, height: 667});
      const messages = [];
      let stage = 'page load';
      await mockSiteApi(page, {
        galleryDelay: route === 'beranda' ? 500 : 0,
        imageDelay: route === 'beranda' ? 7500 : 0
      });

      page.on('console', msg => {
        messages.push({type: 'console.'+msg.type(), text: msg.text()});
      });
      page.on('pageerror', err => {
        messages.push({type: 'pageerror', text: err.message});
      });
      page.on('requestfailed', req => {
        messages.push({type: 'requestfailed', url: req.url(), reason: req.failure().errorText});
      });

      try {
        const routeHash = route === 'video' ? '/video?id=v02' : `/${route}`;
        const url = `http://127.0.0.1:${address.port}/index.html#${routeHash}`;
        const splashStartedAt = Date.now();
        await page.goto(url, {waitUntil: 'domcontentloaded', timeout: 30000});
        await page.waitForSelector('#root > *', {timeout: 10000});
        if (route === 'beranda') {
          await page.waitForSelector('.initial-loading-screen', {timeout: 10000});
          assert.equal(
            await page.$eval('.initial-loading-screen p', message => message.textContent),
            'Wait, load some content...'
          );
          assert.equal(
            await page.$eval('.site-foreground', foreground => foreground.inert),
            true,
            'The page behind the startup screen is inert.'
          );
          assert.equal(
            await page.$eval('.initial-loading-spinner', spinner => getComputedStyle(spinner).borderRadius),
            '50%'
          );
          assert.ok(await page.$('.welcome-gallery-loading'), 'Welcome gallery shows skeletons while database photos load.');
          assert.equal(
            await page.$$eval('.gallery-highlight-card--skeleton', cards => cards.length),
            7,
            'Gallery spotlights reserve their layout while database photos load.'
          );
          await page.waitForSelector(
            '.welcome-gallery-tile:not(.is-image-ready):not(.is-image-error) .welcome-gallery-tile-skeleton',
            {timeout: 10000}
          );
          await page.waitForSelector(
            '.gallery-highlight-card.is-image-loading .home-photo-skeleton',
            {timeout: 10000}
          );
          await waitForInitialLoading(page);
          assert.ok(Date.now() - splashStartedAt >= 5000, 'The startup screen stays visible for five seconds.');
          assert.equal(
            await page.$eval('.site-foreground', foreground => foreground.inert),
            false,
            'The page becomes interactive after the startup screen closes.'
          );
        } else {
          await waitForInitialLoading(page);
        }
        await wait(250);
        stage = 'mobile touch-hover check';
        const mobileHoverTargets = {
          beranda: '.welcome-gallery',
          siswa: '.people-card',
          guru: '.people-card',
          galeri: '.gallery-item',
          video: '.video-card',
          komentar: 'textarea[maxlength="500"]'
        };
        const mobilePage = await browser.newPage();
        try {
          await mockSiteApi(mobilePage);
          await mobilePage.setViewport({width: 390, height: 844, isMobile: true, hasTouch: true});
          await mobilePage.goto(url, {waitUntil: 'domcontentloaded', timeout: 30000});
          await waitForInitialLoading(mobilePage);
          await mobilePage.waitForSelector(mobileHoverTargets[route], {timeout: 10000});
          assert.equal(
            await mobilePage.evaluate(() => matchMedia('(hover: hover) and (pointer: fine)').matches),
            false,
            'Touch emulation should not qualify for desktop hover effects.'
          );
          const hoverElement = await mobilePage.$(mobileHoverTargets[route]);
          assert.ok(hoverElement, `${route} has a visible hover-test target.`);
          const visualState = element => mobilePage.evaluate(node => {
            const style = getComputedStyle(node);
            return [style.backgroundColor, style.color, style.borderColor, style.boxShadow, style.transform];
          }, element);
          const beforeHover = await visualState(hoverElement);
          await hoverElement.hover();
          await wait(200);
          assert.deepEqual(
            await visualState(hoverElement),
            beforeHover,
            `${route} should not retain desktop hover highlighting on touch.`
          );
        } finally {
          await mobilePage.close();
        }
        {
          if (['siswa', 'guru', 'galeri', 'video'].includes(route)) {
            assert.equal(
              await page.$eval('.nav-picker[data-group="pages"] .nav-picker-trigger.active', trigger => trigger.dataset.page),
              route
            );
            assert.equal(
              await page.$eval(`.nav-picker[data-group="pages"] .nav-picker-link[data-page="${route}"]`, link => link.getAttribute('href')),
              `#/${route}`
            );
          } else {
            assert.equal(
              await page.$('.nav-picker[data-group="pages"] .nav-picker-trigger.active'),
              null,
              `${route} has no active explore navigation item.`
            );
          }
          if (route === 'siswa' || route === 'guru') {
          const people = route === 'guru' ? browserTeachers : browserCards;
          const expectedCount = people.length;
          assert.equal(await page.$$eval('.people-card', cards => cards.length), expectedCount);
          assert.equal(
            await page.$eval('.nav-picker[data-group="pages"] .nav-picker-trigger.active', trigger => trigger.dataset.page),
            route
          );

          const search = await page.$eval('input[type="search"]', input => input.getAttribute('aria-label'));
          assert.ok(search, 'React people page has an accessible search field.');
          const searchTerm = people[0].nama;
          await page.type('input[type="search"]', searchTerm);
          const matchingCount = people.filter(person =>
            person.nama.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (person.jabatan || person.mapel).toLowerCase().includes(searchTerm.toLowerCase())
          ).length;
          assert.equal(await page.$$eval('.people-card', cards => cards.length), matchingCount);

          await page.click('input[type="search"]');
          await page.keyboard.down('Control');
          await page.keyboard.press('A');
          await page.keyboard.up('Control');
          await page.type('input[type="search"]', '__no_matching_person__');
          assert.equal(await page.$$eval('.people-card', cards => cards.length), 0);
          assert.ok(await page.$('.empty-note'), 'Empty search results show an explanation.');
          } else if (route === 'galeri') {
            const count = browserPhotos.length;
            assert.equal((await page.$$('.gallery-item')).length, count);
            await page.click('.gallery-item');
            assert.ok(await page.$('[role="dialog"]'), 'Selecting a photo opens its dialog.');
            await page.keyboard.press('Escape');
            assert.equal(await page.$('[role="dialog"]'), null, 'Escape closes the photo dialog.');
          } else if (route === 'video') {
            const count = browserVideos.length;
            assert.equal((await page.$$('.video-card')).length, count);
            assert.ok(await page.$('.video-frame button.video-play[aria-label]'), 'Video players have accessible labels.');
            assert.ok(await page.$('#video-v02.is-selected iframe[title]'), 'A selected highlight opens and plays its matching video.');
            await page.click('.video-play');
            assert.ok(await page.$('.video-frame iframe[title]'), 'Playing a video loads an embed with an accessible title.');
          } else if (route === 'beranda') {
            stage = 'welcome and navbar checks';
            assert.ok(await page.$('.hero-beranda'), 'Home page renders the class hero.');
            await page.waitForSelector('.gallery-highlight-card img', {timeout: 10000});
            await page.evaluate(() => document.getElementById('gallery-spotlight').scrollIntoView({
              block: 'center',
              behavior: 'instant'
            }));
            await page.evaluate(() => window.scrollTo({top: 0, behavior: 'instant'}));
            assert.ok(await page.$('.welcome-gallery-tile img'), 'Welcome hero renders gallery photos.');
            await page.waitForSelector('.welcome-gallery-tile.is-image-ready', {timeout: 10000});
            assert.equal(await page.$('.welcome-actions'), null, 'Welcome hero has no action buttons.');
            await page.waitForFunction(
              () => getComputedStyle(document.querySelector('.site-header')).visibility === 'hidden',
              {timeout: 5000}
            );
            assert.equal(
              await page.$eval('.site-header', header => getComputedStyle(header).visibility),
              'hidden',
              'The main navigation stays hidden while the welcome hero is in view.'
            );
            const welcomeLayout = await page.evaluate(() => ({
              title: document.querySelector('#welcome-title').getBoundingClientRect().top,
              gallery: document.querySelector('.welcome-gallery').getBoundingClientRect().top,
              slogan: document.querySelector('.welcome-tagline').getBoundingClientRect().top
            }));
            assert.ok(
              welcomeLayout.title < welcomeLayout.gallery &&
                welcomeLayout.gallery < welcomeLayout.slogan,
              'Welcome title, photo arc, and class slogan appear in order.'
            );
            assert.equal(await page.$('.class-lineup'), null, 'Home page does not render the class structure section.');
            const gallerySources = await page.$$eval(
              '.gallery-highlight-card img',
              images => images.map(image => image.getAttribute('src'))
            );
            assert.equal(gallerySources.length, 7, 'Home page renders seven bento gallery highlights.');
            assert.equal(new Set(gallerySources).size, 7, 'Gallery highlights use distinct photos.');
            assert.ok(
              gallerySources.every(source => browserPhotos.some(photo => photo.url === source)),
              'Gallery highlights use only photos returned by the database API.'
            );
            const welcomeSources = await page.$$eval(
              '.welcome-gallery-tile img',
              images => [...new Set(images.map(image => image.getAttribute('src')))]
            );
            assert.ok(
              welcomeSources.length > 0 &&
                welcomeSources.every(source => browserPhotos.some(photo => photo.url === source)),
              'Welcome hero uses only photos returned by the database API.'
            );
            assert.equal(await page.$('.gallery-highlight-stage .route-label'), null, 'Gallery highlights show only the section title.');
            assert.equal(
              await page.evaluate(() => {
                const title = document.querySelector('#gallery-spotlight-title').getBoundingClientRect();
                return [...document.querySelectorAll('.gallery-highlight-card')].some(card => {
                  const bounds = card.getBoundingClientRect();
                  return bounds.left < title.right && bounds.right > title.left &&
                    bounds.top < title.bottom && bounds.bottom > title.top;
                });
              }),
              false,
              'Gallery photos stay clear of the section title.'
            );
            const videoCards = await page.$$eval('.video-highlight-card', cards => cards.map(card => ({
              href: card.getAttribute('href'),
              title: card.querySelector('strong')?.textContent.trim(),
              poster: card.querySelector('img')?.getAttribute('src')
            })));
            assert.equal(videoCards.length, 7, 'Video spotlight shows seven representative thumbnails.');
            assert.equal(
              new Set(videoCards.map(card => card.href)).size,
              7,
              'Each video card links to a distinct video.'
            );
            assert.ok(
              videoCards.every(card => card.href?.startsWith('#/video?id=') && card.title && card.poster),
              'Video cards keep their titles, posters, and direct playback links.'
            );
            const spotlightBento = await page.evaluate(() => {
              const measure = (layoutSelector, gridSelector, cardSelector) => {
                const layout = document.querySelector(layoutSelector);
                const grid = document.querySelector(gridSelector);
                const cards = [...document.querySelectorAll(cardSelector)];
                const featured = cards[0];
                const wide = cards[1];
                const standard = cards[3];
                const layoutBounds = layout.getBoundingClientRect();
                const gridStyle = getComputedStyle(grid);
                const featuredBounds = featured.getBoundingClientRect();
                const wideBounds = wide.getBoundingClientRect();
                const standardBounds = standard.getBoundingClientRect();
                return {
                  layoutHeight: layoutBounds.height,
                  viewportHeight: window.innerHeight,
                  gridColumns: gridStyle.gridTemplateColumns.split(' ').length,
                  gridRows: gridStyle.gridTemplateRows.split(' ').length,
                  featuredWidth: featuredBounds.width,
                  featuredHeight: featuredBounds.height,
                  wideWidth: wideBounds.width,
                  wideHeight: wideBounds.height,
                  standardWidth: standardBounds.width,
                  standardHeight: standardBounds.height,
                  featuredClassName: featured.className,
                  wideClassName: wide.className
                };
              };
              return {
                gallery: measure('.gallery-highlight-layout', '.gallery-highlight-stage', '.gallery-highlight-card'),
                video: measure('.video-spotlight-layout', '.video-highlight-grid', '.video-highlight-card')
              };
            });
            for (const [section, layout] of Object.entries(spotlightBento)) {
              assert.equal(layout.gridColumns, 4, `${section} uses a 4-column bento grid on desktop.`);
              assert.equal(layout.gridRows, 3, `${section} uses a 3-row bento grid on desktop.`);
              assert.ok(
                layout.layoutHeight <= layout.viewportHeight - 65,
                `${section} fits within calc(100vh - 70px) on desktop: ${JSON.stringify(layout)}`
              );
              assert.ok(
                layout.featuredWidth > layout.standardWidth * 1.7 &&
                  layout.featuredHeight > layout.standardHeight * 1.7,
                `${section} lead card spans 2x2: ${JSON.stringify(layout)}`
              );
              assert.ok(
                layout.wideWidth > layout.standardWidth * 1.7 &&
                  layout.featuredHeight > layout.wideHeight * 1.7,
                `${section} side cards span 2x1: ${JSON.stringify(layout)}`
              );
              assert.match(
                layout.featuredClassName,
                /--featured/,
                `${section} lead card receives its featured layout class.`
              );
              assert.match(
                layout.wideClassName,
                /--wide/,
                `${section} side card receives its wide layout class.`
              );
            }
            await page.evaluate(() => document.getElementById('gallery-spotlight').scrollIntoView({
              block: 'start',
              behavior: 'instant'
            }));
            await page.screenshot({
              path: path.join(SCREENSHOT_DIR, 'home-bento-desktop.png'),
              fullPage: false
            });
            await page.evaluate(() => document.getElementById('video-spotlight').scrollIntoView({
              block: 'start',
              behavior: 'instant'
            }));
            await page.screenshot({
              path: path.join(SCREENSHOT_DIR, 'home-video-bento-desktop.png'),
              fullPage: false
            });
            await page.emulateMediaFeatures([{name: 'prefers-reduced-motion', value: 'no-preference'}]);
            assert.equal(
              await page.$eval('.video-highlight-card', card => getComputedStyle(card).animationName),
              'spotlight-card-enter',
              'Spotlight cards use a staggered entrance animation.'
            );
            await page.emulateMediaFeatures([{name: 'prefers-reduced-motion', value: 'reduce'}]);
            assert.equal(
              await page.$eval('.video-highlight-card', card => getComputedStyle(card).animationName),
              'none',
              'Spotlight entrance motion respects reduced-motion preferences.'
            );
            await page.emulateMediaFeatures([{name: 'prefers-reduced-motion', value: 'no-preference'}]);
            assert.deepEqual(
              await page.$$eval('.nav-picker-trigger', triggers => triggers.map(trigger => trigger.textContent.trim())),
              ['Home', 'Jelajahi'],
              'The main navigation groups home links separately from page links.'
            );
            assert.deepEqual(
              await page.$$eval('.nav-picker[data-group="home"] .nav-picker-link', links => links.map(link => link.textContent.trim())),
              ['Beranda', 'Sorotan Galeri', 'Sorotan Video', 'Jadwal', 'Footer'],
              'The home menu links to its sections and footer.'
            );
            assert.deepEqual(
              await page.$$eval('.nav-picker[data-group="pages"] .nav-picker-link', links => links.map(link => link.textContent.trim())),
              ['Siswa', 'Guru', 'Galeri', 'Video', 'Masuk', 'Daftar'],
              'The explore menu includes students, teachers, login, and registration.'
            );
            await page.evaluate(() => {
              const hero = document.querySelector('.welcome-hero');
              window.scrollTo({
                top: window.scrollY + hero.getBoundingClientRect().bottom + 1,
                behavior: 'instant'
              });
            });
            await page.waitForFunction(
              () => getComputedStyle(document.querySelector('.site-header')).visibility === 'visible',
              {timeout: 5000}
            );
            assert.equal(
              await page.$eval('.site-header', header => getComputedStyle(header).visibility),
              'visible',
              'The main navigation appears after scrolling past the welcome hero.'
            );
            assert.equal((await page.$$('.stat-card')).length, 5);
            const statGeometry = await page.$$eval('.stat-row > .stat-card', cards => (
              cards.map(card => {
                const {left, top, right, bottom} = card.getBoundingClientRect();
                return {left, top, right, bottom};
              })
            ));
            assert.equal(statGeometry.length, 5, 'All summary cards are direct grid items.');
            assert.ok(
              statGeometry.every((card, index) => statGeometry.slice(index + 1).every(other =>
                card.right <= other.left || other.right <= card.left ||
                card.bottom <= other.top || other.bottom <= card.top
              )),
              'Summary cards do not overlap.'
            );
            const untimedAgenda = await page.$eval('.agenda-row--text', row => ({
              columns: getComputedStyle(row).gridTemplateColumns.split(' ').length,
              contentWidth: row.querySelector('.agenda-row-content').getBoundingClientRect().width
            }));
            assert.equal(untimedAgenda.columns, 2, 'Untimed agenda notes use a marker and full-width content track.');
            assert.ok(untimedAgenda.contentWidth > 300, 'Untimed agenda notes have enough room to wrap naturally.');
            assert.ok(await page.$('.agenda-card--schedule'), 'Home page renders the schedule dashboard.');
            assert.ok(await page.$('.agenda-card--duty'), 'Home page renders the duty dashboard.');
            assert.equal((await page.$$('.agenda-day-button')).length, 2);
            const currentDay = await page.$eval('.agenda-card--duty .agenda-eyebrow', node => node.textContent);
            stage = 'agenda schedule button';
            await page.$eval('.agenda-day-button:nth-child(2)', button => button.scrollIntoView({
              block: 'center',
              behavior: 'instant'
            }));
            await wait(50);
            await page.click('.agenda-day-button:nth-child(2)');
            await page.waitForFunction(
              () => document.querySelector('.agenda-day-button:nth-child(2)').getAttribute('aria-pressed') === 'true',
              {timeout: 2000}
            );
            const tomorrowState = await page.evaluate(() => ({
              pressed: document.querySelector('.agenda-day-button:nth-child(2)').getAttribute('aria-pressed'),
              chatOpen: document.querySelector('#global-chat-dialog').open,
              activeElement: document.activeElement.className
            }));
            assert.equal(
              tomorrowState.pressed,
              'true',
              `Selecting tomorrow activates its schedule button: ${JSON.stringify(tomorrowState)}`
            );
            assert.notEqual(
              await page.$eval('.agenda-card--duty .agenda-eyebrow', node => node.textContent),
              currentDay,
              'Selecting tomorrow updates the duty schedule.'
            );
            await page.click('.agenda-day-button:first-child');
            stage = 'home navigation section link';
            await page.click('.nav-picker[data-group="home"] summary');
            await page.click('.nav-picker[data-group="home"] a[href*="section=video-spotlight"]');
            stage = 'home navigation hash change';
            await page.waitForFunction(
              () => window.location.hash === '#/beranda?section=video-spotlight',
              {timeout: 3000}
            );
            stage = 'home navigation focus target';
            try {
              await page.waitForFunction(
                () => document.activeElement.id === 'video-spotlight',
                {timeout: 3000}
              );
            } catch {
              const focusState = await page.evaluate(() => ({
                hash: window.location.hash,
                activeElement: document.activeElement?.id,
                target: Boolean(document.getElementById('video-spotlight'))
              }));
              throw new Error(`Home section navigation did not focus its target: ${JSON.stringify(focusState)}`);
            }
            const footerLinks = await page.evaluate(() => {
              const {UI} = window.XIRPL1_DATA;
              return {
                classWebsite: UI.links.class.website,
                classSocial: [
                  [UI.footer.youtubeLabel, UI.links.class.youtube],
                  [UI.footer.tiktokLabel, UI.links.class.tiktok],
                  [UI.footer.instagramLabel, UI.links.class.instagram]
                ],
                schoolWebsite: UI.links.school.website,
                schoolSocial: [
                  [UI.footer.schoolYoutubeLabel, UI.links.school.youtube],
                  [UI.footer.schoolTiktokLabel, UI.links.school.tiktok],
                  [UI.footer.schoolInstagramLabel, UI.links.school.instagram]
                ]
              };
            });
            assert.deepEqual(
              await page.$$eval('.footer-link-group[data-group="class"] .footer-links a', links => (
                links.map(link => [link.textContent.trim(), link.getAttribute('href')])
              )),
              [['Website Kelas', footerLinks.classWebsite]],
              'The class footer group links only to the class website.'
            );
            assert.deepEqual(
              await page.$$eval('.footer-link-group[data-group="class"] .footer-social-link', links => (
                links.map(link => [link.getAttribute('aria-label'), link.getAttribute('href')])
              )),
              footerLinks.classSocial,
              'The class footer group links to its social channels.'
            );
            assert.deepEqual(
              await page.$$eval('.footer-link-group[data-group="school"] .footer-links a', links => (
                links.map(link => [link.textContent.trim(), link.getAttribute('href')])
              )),
              [['Website sekolah', footerLinks.schoolWebsite]],
              'The school website is separate from class links.'
            );
            assert.deepEqual(
              await page.$$eval('.footer-link-group[data-group="school"] .footer-social-link', links => (
                links.map(link => [link.getAttribute('aria-label'), link.getAttribute('href')])
              )),
              footerLinks.schoolSocial,
              'The school footer group links to its social channels.'
            );
            await page.click('.nav-picker[data-group="home"] summary');
            await page.click('.nav-picker[data-group="home"] a[href*="section=site-footer"]');
            stage = 'footer navigation hash change';
            await page.waitForFunction(
              () => window.location.hash === '#/beranda?section=site-footer',
              {timeout: 3000}
            );
            stage = 'footer navigation focus target';
            try {
              await page.waitForFunction(
                () => document.activeElement.id === 'site-footer',
                {timeout: 3000}
              );
            } catch {
              const focusState = await page.evaluate(() => ({
                hash: window.location.hash,
                activeElement: document.activeElement?.id,
                target: Boolean(document.getElementById('site-footer'))
              }));
              throw new Error(`Footer section navigation did not focus its target: ${JSON.stringify(focusState)}`);
            }
            stage = 'footer wordmark reveal';
            await page.$eval('.footer-wordmark', wordmark => wordmark.scrollIntoView({
              block: 'center',
              behavior: 'instant'
            }));
            await page.waitForFunction(
              () => document.querySelector('.footer-wordmark').classList.contains('is-revealed'),
              {timeout: 10000}
            );
            assert.deepEqual(
              await page.$eval('.footer-wordmark-letter', letter => {
                const animation = getComputedStyle(letter);
                return [animation.animationDuration, animation.animationIterationCount];
              }),
              ['6.62s', 'infinite'],
              'The footer wordmark appears, holds for six seconds, then repeats.'
            );
          } else if (route === 'komentar') {
            assert.equal(
              await page.$eval('#global-chat-dialog', dialog => dialog.open),
              true,
              'The legacy discussion route opens the global chat dialog.'
            );
            assert.ok(await page.$('textarea[maxlength="500"]'), 'Comment form enforces the 500 character limit.');
            await page.type('#commentInput', 'Tes komentar');
            assert.equal(await page.$eval('.comment-form-footer span', node => node.textContent), '12/500');
          }

          stage = 'global chat dialog';
          assert.ok(await page.$('.global-chat-trigger'), 'The global chat trigger is available on every route.');
          if (route !== 'komentar') {
            await page.click('.global-chat-trigger');
          }
          await page.waitForFunction(() => document.querySelector('#global-chat-dialog').open);
          await page.keyboard.press('Escape');
          await page.waitForFunction(() => !document.querySelector('#global-chat-dialog').open);
          assert.equal(
            await page.evaluate(() => document.activeElement.classList.contains('global-chat-trigger')),
            true,
            'Closing the chat returns focus to its trigger.'
          );

          await page.setViewport({width: 390, height: 844});
          if (route === 'beranda') {
            await page.evaluate(() => window.scrollTo({top: 0, behavior: 'instant'}));
            await wait(150);
            const mobileGalleryStreams = await page.$$eval(
              '.welcome-gallery-stream',
              streams => streams.map(stream => ({
                direction: stream.dataset.direction,
                animationName: getComputedStyle(stream.querySelector('.welcome-gallery-tile')).animationName
              }))
            );
            assert.equal(mobileGalleryStreams.length, 2, 'Mobile hero renders two stacked image slider units.');
            assert.deepEqual(
              mobileGalleryStreams.map(stream => stream.direction),
              ['forward', 'reverse'],
              'Mobile hero sliders move in opposite directions.'
            );
            assert.notEqual(
              mobileGalleryStreams[0].animationName,
              mobileGalleryStreams[1].animationName,
              'Mobile hero sliders use distinct opposing keyframes.'
            );
            fs.mkdirSync(SCREENSHOT_DIR, {recursive: true});
            await page.screenshot({
              path: path.join(SCREENSHOT_DIR, 'welcome-hero-mobile.png'),
              fullPage: false
            });
            await page.evaluate(() => {
              const hero = document.querySelector('.welcome-hero');
              window.scrollTo({
                top: window.scrollY + hero.getBoundingClientRect().bottom + 1,
                behavior: 'instant'
              });
            });
            await wait(100);
          }
          stage = 'mobile layout check';
          const overflowDetails = await page.evaluate(() => ({
            documentWidth: document.documentElement.scrollWidth,
            viewportWidth: window.innerWidth,
            elements: [...document.querySelectorAll('body *')]
              .filter(element => {
                const bounds = element.getBoundingClientRect();
                return bounds.right > window.innerWidth + 1 || bounds.left < -1;
              })
              .slice(0, 8)
              .map(element => ({
                selector: element.tagName.toLowerCase() +
                  (element.className && typeof element.className === 'string'
                    ? '.' + element.className.trim().replace(/\s+/g, '.')
                    : ''),
                left: Math.round(element.getBoundingClientRect().left),
                right: Math.round(element.getBoundingClientRect().right)
              }))
          }));
          assert.ok(
            overflowDetails.documentWidth <= overflowDetails.viewportWidth,
            `${route} should not overflow horizontally at mobile width: ${JSON.stringify(overflowDetails)}`
          );
          if (route === 'beranda') {
            const mobileSpotlight = await page.evaluate(() => ({
              galleryColumns: getComputedStyle(document.querySelector('.gallery-highlight-stage')).gridTemplateColumns.split(' ').length,
              galleryFeaturedWidth: document.querySelector('.gallery-highlight-card').getBoundingClientRect().width,
              videoColumns: getComputedStyle(document.querySelector('.video-highlight-grid')).gridTemplateColumns.split(' ').length,
              videoFeaturedWidth: document.querySelector('.video-highlight-card').getBoundingClientRect().width,
              viewport: window.innerWidth
            }));
            assert.equal(mobileSpotlight.galleryColumns, 2);
            assert.equal(mobileSpotlight.videoColumns, 2);
            assert.ok(
              mobileSpotlight.galleryFeaturedWidth < mobileSpotlight.viewport &&
                mobileSpotlight.videoFeaturedWidth < mobileSpotlight.viewport,
              `Mobile bento cards should fit the layout container: ${JSON.stringify(mobileSpotlight)}`
            );
          }
          stage = 'mobile navigation menu';
          await page.click('.menu-toggle');
          assert.equal(
            await page.$eval('.menu-toggle', button => button.getAttribute('aria-expanded')),
            'true',
            `${route} menu button should open the navigation.`
          );
          assert.ok(await page.$eval('.tabbar', nav => nav.classList.contains('open')));
          if (route === 'beranda') {
            await wait(240);
            const mobileMenuChevrons = await page.$$eval(
              '.nav-picker-trigger svg',
              icons => icons.map(icon => Math.round(icon.getBoundingClientRect().right))
            );
            assert.equal(mobileMenuChevrons.length, 2);
            assert.ok(
              Math.abs(mobileMenuChevrons[0] - mobileMenuChevrons[1]) <= 2,
              `Mobile navbar chevrons should align on the right edge: ${JSON.stringify(mobileMenuChevrons)}`
            );
            await page.screenshot({
              path: path.join(SCREENSHOT_DIR, 'mobile-navbar-open.png'),
              fullPage: false
            });
          }
          await page.click('.menu-toggle');
          assert.equal(await page.$eval('.menu-toggle', button => button.getAttribute('aria-expanded')), 'false');
          const previousTheme = await page.$eval('.theme-toggle', button => button.getAttribute('aria-pressed'));
          const footerBackground = await page.$eval(
            '.site-footer',
            footer => getComputedStyle(footer).backgroundColor
          );
          stage = 'theme toggle';
          await page.click('.theme-toggle');
          assert.notEqual(await page.$eval('.theme-toggle', button => button.getAttribute('aria-pressed')), previousTheme);
          assert.equal(
            await page.$eval('.site-footer', footer => getComputedStyle(footer).backgroundColor),
            footerBackground,
            'Footer background stays dark when changing the page theme.'
          );
          await page.click('.theme-toggle');
          const pageErrors = messages.filter(message => message.type === 'pageerror');
          assert.equal(pageErrors.length, 0, `${route} should not raise browser runtime errors.`);
        }
        const ssPath = path.join(SCREENSHOT_DIR, route + '.png');
        fs.mkdirSync(path.dirname(ssPath), {recursive:true});
        await page.screenshot({path:ssPath, fullPage:false});
        if (route === 'beranda') {
          await page.setViewport({width: 1027, height: 667});
          await page.evaluate(() => document.getElementById('dashboard').scrollIntoView({
            block: 'start',
            behavior: 'instant'
          }));
          await page.screenshot({
            path: path.join(SCREENSHOT_DIR, 'beranda-desktop.png'),
            fullPage: false
          });
          await page.evaluate(() => document.querySelector('.stat-row').scrollIntoView({
            block: 'center',
            behavior: 'instant'
          }));
          await page.screenshot({
            path: path.join(SCREENSHOT_DIR, 'beranda-summary-desktop.png'),
            fullPage: false
          });
        }
        results.push({file:route, messages, screenshot:ssPath});
      } catch (err) {
        results.push({file:route, error: `${stage}: ${(err && err.message) || String(err)}`, messages});
      }
      await page.close();
    }

    const mobileBackgroundPage = await browser.newPage();
    await mobileBackgroundPage.setViewport({width: 390, height: 844});
    await mobileBackgroundPage.setRequestInterception(true);
    mobileBackgroundPage.on('request', request => {
      const pathname = new URL(request.url()).pathname;
      if (pathname === '/api/auth/me') {
        return request.respond({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            user: {username: 'browser_student', displayName: 'Browser Student', role: 'student'}
          })
        });
      }
      if (pathname === '/api/cards/me') {
        const background = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='1200' height='300'%3E%3Crect width='100%25' height='100%25' fill='blue'/%3E%3C/svg%3E";
        return request.respond({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            card: {
              id: 's01',
              nama: 'Browser Student',
              jabatan: 'Siswa',
              hobi: '',
              catatan: '',
              foto: '',
              avatar: null,
              background: {url: background},
              portfolio: ''
            }
          })
        });
      }
      return request.continue();
    });
    try {
      await mobileBackgroundPage.goto(
        `http://127.0.0.1:${address.port}/index.html#/card-saya`,
        {waitUntil: 'domcontentloaded', timeout: 30000}
      );
      await waitForInitialLoading(mobileBackgroundPage);
      await mobileBackgroundPage.waitForSelector('.media-uploader-preview--background img');
      const backgroundPreviewBounds = await mobileBackgroundPage.evaluate(() => {
        const preview = document.querySelector('.media-uploader-preview--background');
        const image = preview.querySelector('img');
        const uploader = preview.closest('.media-uploader');
        const uploaderBounds = uploader.getBoundingClientRect();
        const previewBounds = preview.getBoundingClientRect();
        const imageBounds = image.getBoundingClientRect();
        const overflowingContents = [...uploader.querySelectorAll('small, input[type="file"]')]
          .map(element => ({
            selector: element.tagName.toLowerCase() +
              (element.type ? `[type="${element.type}"]` : ''),
            right: element.getBoundingClientRect().right,
            scrollWidth: element.scrollWidth,
            clientWidth: element.clientWidth
          }))
          .filter(element =>
            element.right > uploaderBounds.right + 1 ||
            element.scrollWidth > element.clientWidth + 1
          );
        return {
          uploaderRight: uploaderBounds.right,
          previewRight: previewBounds.right,
          imageRight: imageBounds.right,
          imageWidth: imageBounds.width,
          previewWidth: previewBounds.width,
          documentWidth: document.documentElement.scrollWidth,
          viewportWidth: window.innerWidth,
          naturalImageWidth: image.naturalWidth,
          overflowingContents
        };
      });
      assert.equal(backgroundPreviewBounds.naturalImageWidth, 1200);
      assert.ok(
        backgroundPreviewBounds.previewRight <= backgroundPreviewBounds.uploaderRight,
        `Background preview frame should stay within its uploader on mobile: ${JSON.stringify(backgroundPreviewBounds)}`
      );
      assert.ok(
        backgroundPreviewBounds.imageWidth <= backgroundPreviewBounds.previewWidth + 1,
        `Background preview image should stay within its frame on mobile: ${JSON.stringify(backgroundPreviewBounds)}`
      );
      assert.ok(
        backgroundPreviewBounds.documentWidth <= backgroundPreviewBounds.viewportWidth,
        `Card editor should not overflow horizontally on mobile: ${JSON.stringify(backgroundPreviewBounds)}`
      );
      assert.deepEqual(
        backgroundPreviewBounds.overflowingContents,
        [],
        `Upload helper text and file control should stay within the uploader on mobile: ${JSON.stringify(backgroundPreviewBounds)}`
      );
      results.push({file: 'card-editor-background-mobile', backgroundPreviewBounds});
    } finally {
      await mobileBackgroundPage.close();
    }

    async function runAuthLogin(next, displayName = "Browser Member") {
      const authPage = await browser.newPage();
      const authPageErrors = [];
      let loginHeaders = null;
      authPage.on('pageerror', error => authPageErrors.push(error.message));
      await authPage.setRequestInterception(true);
      authPage.on('request', request => {
        const pathname = new URL(request.url()).pathname;
        if (pathname === '/api/auth/me') {
          return request.respond({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({user: null})
          });
        }
        if (pathname === '/api/profile/me') {
          return request.respond({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              user: {
                username: 'browser_member',
                displayName,
                role: 'member',
                joinedAt: '2026-01-01T00:00:00.000Z'
              },
              card: null
            })
          });
        }
        if (pathname === '/api/auth/login') {
          loginHeaders = request.headers();
          return request.respond({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              user: {username: 'browser_member', displayName, role: 'member'},
              mustChangePassword: false
            })
          });
        }
        return request.continue();
      });

      try {
        await authPage.goto(
          `http://127.0.0.1:${address.port}/index.html#/login?next=${encodeURIComponent(next)}`,
          {waitUntil: 'domcontentloaded', timeout: 30000}
        );
        await waitForInitialLoading(authPage);
        await authPage.waitForSelector('#login-username');
        assert.equal(
          await authPage.$eval('#login-username', input => input.autocomplete),
          'username'
        );
        assert.equal(
          await authPage.$eval('#login-password', input => input.autocomplete),
          'current-password'
        );
        assert.ok(
          await authPage.$('label[for="login-username"]'),
          'Login username has a visible label.'
        );
        await authPage.type('#login-username', 'browser_member');
        await authPage.type('#login-password', 'A-valid-password-48!');
        await authPage.click('.auth-submit');
        await authPage.waitForFunction(
          () => window.location.hash === '#/beranda' ||
            window.location.hash === '#/profil',
          {timeout: 10000}
        );
        assert.equal(loginHeaders?.['x-requested-with'], 'fetch');
        assert.equal(loginHeaders?.['content-type'], 'application/json');
        assert.equal(
          await authPage.evaluate(() => {
            const keys = [...Object.keys(localStorage), ...Object.keys(sessionStorage)];
            return keys.some(key => /auth|session|token|user/i.test(key));
          }),
          false,
          'Auth data is not persisted in browser storage.'
        );
        assert.equal(
          authPageErrors.length,
          0,
          `Auth pages should not raise browser errors: ${authPageErrors.join('; ')}`
        );
        return authPage;
      } catch (error) {
        await authPage.close();
        throw error;
      }
    }

    for (const unsafeNext of [
      'https://evil.example',
      '//evil.example',
      'javascript:alert(1)'
    ]) {
      const authPage = await runAuthLogin(unsafeNext);
      try {
        assert.equal(
          await authPage.evaluate(() => window.location.hash),
          '#/beranda',
          `Unsafe redirect ${unsafeNext} should fall back to the home page.`
        );
      } finally {
        await authPage.close();
      }
    }

    const profilePage = await runAuthLogin(
      '/profil',
      '<img src=x onerror=alert(1)>'
    );
    try {
      await profilePage.waitForSelector('.account-details');
      assert.equal(await profilePage.$('button[aria-controls="profile-name-editor"]'), null);
      assert.equal(await profilePage.$('a[href="#/card-saya"]'), null);
      assert.equal(await profilePage.$('a[href="#/ganti-password"]'), null);
      assert.equal(
        await profilePage.$('img[src="x"]'),
        null,
        'Display names are rendered as text rather than HTML.'
      );
      assert.match(
        await profilePage.$eval('.profile-header h1', node => node.textContent),
        /<img src=x onerror=alert\(1\)>/
      );
      await profilePage.evaluate(() => {
        window.location.hash = '#/ganti-password';
      });
      await profilePage.waitForSelector('.auth-card h1');
      assert.match(
        await profilePage.$eval('.auth-card h1', node => node.textContent),
        /Perubahan password melalui admin/
      );
      assert.equal(await profilePage.$('#current-password'), null);
    } finally {
      await profilePage.close();
    }

    const publicProfilePage = await browser.newPage();
    const publicProfileErrors = [];
    await publicProfilePage.setRequestInterception(true);
    publicProfilePage.on('request', request => {
      const pathname = new URL(request.url()).pathname;
      if (pathname === '/api/auth/me') {
        return request.respond({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({user: null})
        });
      }
      if (pathname === '/api/profile/student_01') {
        return request.respond({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            user: {
              username: 'student_01',
              displayName: 'Public Student',
              role: 'student',
              joinedAt: '2026-01-01T00:00:00.000Z'
            },
            card: browserCards[0]
          })
        });
      }
      return request.continue();
    });
    publicProfilePage.on('pageerror', error => publicProfileErrors.push(error.message));
    try {
      await publicProfilePage.goto(
        `http://127.0.0.1:${address.port}/index.html#/profil/student_01`,
        {waitUntil: 'domcontentloaded', timeout: 30000}
      );
      await waitForInitialLoading(publicProfilePage);
      await publicProfilePage.waitForSelector('.profile-card .people-card');
      assert.match(
        await publicProfilePage.$eval('.profile-header h1', node => node.textContent),
        /Public Student/
      );
      assert.equal(await publicProfilePage.$('button[aria-controls="profile-name-editor"]'), null);
      assert.equal(publicProfileErrors.length, 0, 'Public student profiles should not raise browser errors.');
    } finally {
      await publicProfilePage.close();
    }

    const ownedProfilePage = await browser.newPage();
    const ownedProfileErrors = [];
    let ownerDisplayName = 'Student Owner';
    ownedProfilePage.on('pageerror', error => ownedProfileErrors.push(error.message));
    await ownedProfilePage.setRequestInterception(true);
    ownedProfilePage.on('request', request => {
      const pathname = new URL(request.url()).pathname;
      if (pathname === '/api/auth/me') {
        return request.respond({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            user: {
              username: 'student_owner',
              displayName: ownerDisplayName,
              role: 'student',
              mustChangePassword: false
            }
          })
        });
      }
      if (pathname === '/api/profile/me') {
        if (request.method() === 'PATCH') {
          const input = JSON.parse(request.postData());
          ownerDisplayName = input.displayName;
        }
        return request.respond({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            user: {
              username: 'student_owner',
              displayName: ownerDisplayName,
              role: 'student',
              joinedAt: '2026-01-01T00:00:00.000Z'
            },
            card: browserCards[0]
          })
        });
      }
      return request.continue();
    });
    try {
      await ownedProfilePage.goto(
        `http://127.0.0.1:${address.port}/index.html#/profil`,
        {waitUntil: 'domcontentloaded', timeout: 30000}
      );
      await waitForInitialLoading(ownedProfilePage);
      await ownedProfilePage.waitForSelector('.profile-header h1');
      await ownedProfilePage.waitForSelector('button[aria-controls="profile-name-editor"]');
      await ownedProfilePage.click('button[aria-controls="profile-name-editor"]');
      await ownedProfilePage.click('#profile-display-name');
      await ownedProfilePage.keyboard.down('Control');
      await ownedProfilePage.keyboard.press('A');
      await ownedProfilePage.keyboard.up('Control');
      await ownedProfilePage.type('#profile-display-name', 'Updated Student');
      await ownedProfilePage.click('.profile-name-form .auth-submit');
      await ownedProfilePage.waitForFunction(
        () => document.querySelector('.account-trigger-name')?.textContent === 'Updated Student',
        {timeout: 10000}
      );
      assert.match(
        await ownedProfilePage.$eval('.profile-header h1', node => node.textContent),
        /Updated Student/
      );
      assert.equal(ownedProfileErrors.length, 0, 'Owned profile edits should not raise browser errors.');
    } finally {
      await ownedProfilePage.close();
    }

    const cardEditorPage = await browser.newPage();
    const cardEditorErrors = [];
    let unsavedNavigationPrompts = 0;
    await cardEditorPage.setRequestInterception(true);
    cardEditorPage.on('request', request => {
      const pathname = new URL(request.url()).pathname;
      if (pathname === '/api/auth/me') {
        return request.respond({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            user: {
              username: 'browser_student',
              displayName: 'Browser Student',
              role: 'student',
              mustChangePassword: false
            }
          })
        });
      }
      if (pathname === '/api/cards/me') {
        return request.respond({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({card: browserCards[0]})
        });
      }
      return request.continue();
    });
    cardEditorPage.on('pageerror', error => cardEditorErrors.push(error.message));
    cardEditorPage.on('dialog', async dialog => {
      unsavedNavigationPrompts += 1;
      await dialog.dismiss();
    });
    try {
      await cardEditorPage.setViewport({width: 1440, height: 900});
      await cardEditorPage.goto(
        `http://127.0.0.1:${address.port}/index.html#/card-saya`,
        {waitUntil: 'domcontentloaded', timeout: 30000}
      );
      await waitForInitialLoading(cardEditorPage);
      await cardEditorPage.waitForSelector('#card-fact-value-0');
      assert.equal(await cardEditorPage.$('.site-footer'), null, 'Card editor page omits the site footer.');
      assert.match(
        await cardEditorPage.$eval('.dashboard-sidebar-account', node => node.textContent),
        /Browser Student/
      );
      const studentEditorPlacement = await cardEditorPage.evaluate(() => {
        const preview = document.querySelector('.card-editor-preview').getBoundingClientRect();
        const editor = document.querySelector('.card-editor-form');
        return {
          previewRight: preview.right,
          editorLeft: editor.getBoundingClientRect().left,
          position: getComputedStyle(editor).position
        };
      });
      assert.ok(
        studentEditorPlacement.editorLeft >= studentEditorPlacement.previewRight - 1,
        `The student edit form should stay to the right of the card preview: ${JSON.stringify(studentEditorPlacement)}`
      );
      assert.equal(studentEditorPlacement.position, 'sticky');
      const studentFactFields = await cardEditorPage.evaluate(() => {
        const editor = document.querySelector('.card-fact-editor');
        const labels = [...editor.querySelectorAll('label')].map(label => label.getBoundingClientRect());
        const inputs = [...editor.querySelectorAll('input')].map(input => input.getBoundingClientRect());
        return {
          columns: getComputedStyle(editor).gridTemplateColumns.split(' ').length,
          inputsWideEnough: inputs.every(input => input.width > 200),
          labelsDoNotOverlapInputs: labels.every((label, index) => label.right <= inputs[index].left + 1)
        };
      });
      assert.equal(studentFactFields.columns, 2, 'Desktop fact fields use aligned label and input columns.');
      assert.equal(studentFactFields.inputsWideEnough, true, 'Desktop fact inputs have room for readable values.');
      assert.equal(studentFactFields.labelsDoNotOverlapInputs, true, 'Fact labels do not collide with their inputs.');
      fs.mkdirSync(SCREENSHOT_DIR, {recursive: true});
      await cardEditorPage.screenshot({
        path: path.join(SCREENSHOT_DIR, 'card-editor-form-desktop.png'),
        fullPage: false
      });
      await cardEditorPage.click('#card-fact-value-0');
      await cardEditorPage.keyboard.down('Control');
      await cardEditorPage.keyboard.press('A');
      await cardEditorPage.keyboard.up('Control');
      await cardEditorPage.type('#card-fact-value-0', 'Fakta yang diperbarui');
      await cardEditorPage.waitForSelector('.card-editor-unsaved');
      await wait(50);
      await cardEditorPage.click('.brand[href="#/beranda"]');
      await wait(250);
      const restoredRoute = await cardEditorPage.evaluate(() => ({
        hash: window.location.hash,
        editorVisible: Boolean(document.querySelector('#card-fact-value-0'))
      }));
      assert.deepEqual(
        restoredRoute,
        {hash: '#/card-saya', editorVisible: true},
        `Rejecting navigation should restore the editor, got ${JSON.stringify({
          ...restoredRoute,
          prompts: unsavedNavigationPrompts
        })}.`
      );
      assert.equal(
        unsavedNavigationPrompts,
        1,
        'Rejecting unsaved navigation restores the route without prompting again.'
      );
      await cardEditorPage.setViewport({width: 390, height: 844});
      const mobileFactFields = await cardEditorPage.evaluate(() => {
        const editor = document.querySelector('.card-fact-editor');
        const input = editor.querySelector('input');
        return {
          columns: getComputedStyle(editor).gridTemplateColumns.split(' ').length,
          inputWidth: input.getBoundingClientRect().width,
          formPosition: getComputedStyle(document.querySelector('.card-editor-form')).position,
          viewport: window.innerWidth
        };
      });
      assert.equal(mobileFactFields.columns, 1, 'Mobile fact labels and inputs stack in one column.');
      assert.ok(mobileFactFields.inputWidth > 240 && mobileFactFields.inputWidth < mobileFactFields.viewport);
      assert.equal(mobileFactFields.formPosition, 'static');
      assert.equal(cardEditorErrors.length, 0, 'Card editor should not raise browser errors.');
    } finally {
      await cardEditorPage.close();
    }

    const adminDashboardPage = await browser.newPage();
    const adminDashboardErrors = [];
    await adminDashboardPage.setViewport({width: 1440, height: 900});
    await adminDashboardPage.setRequestInterception(true);
    adminDashboardPage.on('request', request => {
      const pathname = new URL(request.url()).pathname;
      const respond = body => request.respond({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(body)
      });
      if (pathname === '/api/auth/me') {
        return respond({
          user: {
            username: 'admin',
            displayName: 'Browser Admin',
            role: 'admin',
            mustChangePassword: false
          }
        });
      }
      if (pathname === '/api/dashboard/summary') {
        return respond({students: 6, teachers: 4, photos: 4, videos: 4});
      }
      if (pathname === '/api/admin/students') return respond({students: browserAdminStudents});
      if (pathname === '/api/admin/teachers') return respond({teachers: browserAdminTeachers});
      if (pathname === '/api/admin/gallery') return respond({photos: browserAdminGallery});
      if (pathname === '/api/admin/videos') return respond({videos: browserAdminVideos});
      if (pathname === '/api/admin/agenda') return respond({agenda: browserAdminAgenda});
      if (pathname === '/api/teachers') return respond({teachers: browserAdminTeachers});
      if (pathname === '/api/cards') return respond({cards: browserAdminStudents});
      if (request.url().startsWith('https://img.youtube.com/')) {
        return request.respond({
          status: 200,
          contentType: 'image/svg+xml',
          body: '<svg xmlns="http://www.w3.org/2000/svg" width="160" height="90"><rect width="160" height="90" fill="#73c9b2"/></svg>'
        });
      }
      return request.continue();
    });
    adminDashboardPage.on('pageerror', error => adminDashboardErrors.push(error.message));
    try {
      await adminDashboardPage.goto(
        `http://127.0.0.1:${address.port}/index.html#/admin/data?kind=students`,
        {waitUntil: 'domcontentloaded', timeout: 30000}
      );
      await waitForInitialLoading(adminDashboardPage);
      await adminDashboardPage.waitForSelector('.admin-record-grid');
      assert.equal(await adminDashboardPage.$('.site-footer'), null, 'Admin data editor omits the site footer.');
      assert.match(
        await adminDashboardPage.$eval('.dashboard-sidebar-account', node => node.textContent),
        /Browser Admin/
      );
      const studentGridColumns = await adminDashboardPage.$eval(
        '.admin-record-grid',
        grid => getComputedStyle(grid).gridTemplateColumns.split(' ').length
      );
      assert.equal(studentGridColumns, 3, 'Admin student records use three cards per row on desktop.');
      await adminDashboardPage.click('.admin-record-card .admin-record-actions button');
      await adminDashboardPage.waitForSelector('.admin-data-editor');
      const editorPlacement = await adminDashboardPage.evaluate(() => {
        const list = document.querySelector('.admin-data-list').getBoundingClientRect();
        const editor = document.querySelector('.admin-data-editor');
        const bounds = editor.getBoundingClientRect();
        return {
          listRight: list.right,
          editorLeft: bounds.left,
          position: getComputedStyle(editor).position
        };
      });
      assert.ok(
        editorPlacement.editorLeft >= editorPlacement.listRight - 1,
        `The edit panel should sit to the right of the cards: ${JSON.stringify(editorPlacement)}`
      );
      assert.equal(editorPlacement.position, 'sticky', 'The desktop edit panel stays visible while scrolling.');
      fs.mkdirSync(SCREENSHOT_DIR, {recursive: true});
      await adminDashboardPage.screenshot({
        path: path.join(SCREENSHOT_DIR, 'admin-dashboard-edit-desktop.png'),
        fullPage: false
      });

      await adminDashboardPage.click('.admin-data-subtabs button:nth-child(2)');
      await adminDashboardPage.waitForFunction(
        () => document.querySelector('#admin-records-heading')?.textContent.includes('guru')
      );
      await adminDashboardPage.click('.admin-data-tabs[aria-label="Bagian data admin"] button:nth-child(2)');
      await adminDashboardPage.waitForSelector('.admin-record-grid');
      assert.match(
        await adminDashboardPage.$eval('#admin-records-heading', node => node.textContent),
        /Foto galeri/
      );
      assert.equal(
        await adminDashboardPage.$$('.admin-record-card').then(cards => cards.length),
        4,
        'The combined gallery section loads photos from the admin gallery API response.'
      );
      await adminDashboardPage.click('.admin-data-subtabs button:nth-child(2)');
      await adminDashboardPage.waitForFunction(
        () => document.querySelector('#admin-records-heading')?.textContent.includes('video')
      );

      await adminDashboardPage.goto(
        `http://127.0.0.1:${address.port}/index.html#/admin?tab=schedule`,
        {waitUntil: 'domcontentloaded', timeout: 30000}
      );
      await waitForInitialLoading(adminDashboardPage);
      await adminDashboardPage.waitForSelector('.dashboard-agenda-table');
      assert.equal(await adminDashboardPage.$$('.dashboard-agenda-table').then(tables => tables.length), 1);
      assert.equal(await adminDashboardPage.$$('.dashboard-agenda-day-button').then(buttons => buttons.length), 6);
      assert.match(
        await adminDashboardPage.$eval('.dashboard-agenda-table caption', node => node.textContent),
        /Senin/
      );
      await adminDashboardPage.click('.dashboard-agenda-day-button:nth-child(3)');
      assert.match(
        await adminDashboardPage.$eval('.dashboard-agenda-table caption', node => node.textContent),
        /Rabu/
      );
      await adminDashboardPage.click('.dashboard-sidebar a[href="#/admin?tab=duties"]');
      await adminDashboardPage.waitForSelector('.dashboard-agenda-table caption');
      assert.match(
        await adminDashboardPage.$eval('.dashboard-agenda-table caption', node => node.textContent),
        /Piket hari Senin/
      );
      await adminDashboardPage.setViewport({width: 390, height: 844});
      const adminMobileWidth = await adminDashboardPage.evaluate(() => ({
        document: document.documentElement.scrollWidth,
        viewport: window.innerWidth
      }));
      assert.ok(
        adminMobileWidth.document <= adminMobileWidth.viewport,
        `Admin agenda remains within the mobile viewport: ${JSON.stringify(adminMobileWidth)}`
      );
      assert.equal(adminDashboardErrors.length, 0, `Admin dashboard errors: ${adminDashboardErrors.join('; ')}`);
      results.push({file: 'admin-dashboard-layout', editorPlacement, studentGridColumns, adminMobileWidth});
    } finally {
      await adminDashboardPage.close();
    }

    const memberDashboardPage = await browser.newPage();
    const memberDashboardErrors = [];
    await memberDashboardPage.setViewport({width: 390, height: 844});
    await memberDashboardPage.setRequestInterception(true);
    memberDashboardPage.on('request', request => {
      const pathname = new URL(request.url()).pathname;
      const respond = body => request.respond({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(body)
      });
      if (pathname === '/api/auth/me') {
        return respond({
          user: {
            username: 'browser_member',
            displayName: 'Browser Member',
            role: 'member',
            mustChangePassword: false
          }
        });
      }
      if (pathname === '/api/dashboard/summary') {
        return respond({students: 6, teachers: 4, photos: 4, videos: 4});
      }
      if (pathname === '/api/profile/me') {
        return respond({
          user: {
            username: 'browser_member',
            displayName: 'Browser Member',
            role: 'member',
            profileVisible: true,
            avatar: null
          }
        });
      }
      return request.continue();
    });
    memberDashboardPage.on('pageerror', error => memberDashboardErrors.push(error.message));
    try {
      await memberDashboardPage.goto(
        `http://127.0.0.1:${address.port}/index.html#/dashboard`,
        {waitUntil: 'domcontentloaded', timeout: 30000}
      );
      await waitForInitialLoading(memberDashboardPage);
      await memberDashboardPage.waitForSelector('.dashboard-sidebar-account');
      assert.equal(await memberDashboardPage.$('.site-footer'), null, 'Dashboard pages omit the site footer.');
      assert.match(
        await memberDashboardPage.$eval('.dashboard-sidebar-account', node => node.textContent),
        /Browser Member/
      );
      await memberDashboardPage.click('.dashboard-panel-heading .button-primary');
      await memberDashboardPage.waitForSelector('#dashboard-profile-visible');
      const memberMobileWidth = await memberDashboardPage.evaluate(() => ({
        document: document.documentElement.scrollWidth,
        viewport: window.innerWidth
      }));
      assert.ok(
        memberMobileWidth.document <= memberMobileWidth.viewport,
        `Member dashboard remains within the mobile viewport: ${JSON.stringify(memberMobileWidth)}`
      );
      assert.equal(memberDashboardErrors.length, 0, `Member dashboard errors: ${memberDashboardErrors.join('; ')}`);
      results.push({file: 'member-dashboard-layout', memberMobileWidth});
    } finally {
      await memberDashboardPage.close();
    }
  } finally {
    if (browser) await browser.close();
    await viteServer.close();
  }
  fs.mkdirSync(REPORT_DIR, {recursive: true});
  fs.writeFileSync(path.join(REPORT_DIR, 'puppeteer-results.json'), JSON.stringify(results, null, 2));
  const failures = results.filter(result => result.error);
  if (failures.length) {
    throw new Error(`Browser checks failed: ${failures.map(result => `${result.file}: ${result.error}`).join('; ')}`);
  }
  console.log('Done. Results written to reports/puppeteer-results.json');
})();

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const script = fs.readFileSync(path.join(__dirname, '..', 'js', 'app.js'), 'utf8');
const server = fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf8');
const styles = fs.readFileSync(path.join(__dirname, '..', 'styles.css'), 'utf8');

function getInputTag(id) {
    const match = new RegExp(`<input[^>]+id="${id}"[^>]*>`).exec(html);
    return match?.[0] || '';
}

const cameraInput = getInputTag('cameraInput');
const libraryInput = getInputTag('libraryInput');

assert.ok(cameraInput, 'camera input should exist');
assert.ok(libraryInput, 'library input should exist');
assert.match(cameraInput, /type="file"/);
assert.match(libraryInput, /type="file"/);
assert.match(cameraInput, /capture="environment"/);
assert.doesNotMatch(libraryInput, /capture=/);
assert.match(html, /id="photoSourceDialog"/);
assert.match(html, /id="photoSourceContext"/);
assert.match(html, /id="photoMeta"/);
assert.match(html, /id="dayOwnerStrip"/);
assert.match(html, /id="overviewLegend"/);
assert.match(html, /Prikker: bare Henry 0, bare Ellinor 0, begge 0\./);
assert.match(html, /id="loginDialog"/);
assert.match(html, /data-login-owner="henry"/);
assert.match(html, /data-login-owner="ellinor"/);
assert.match(html, /styles\.css\?v=20260622-25/);
assert.match(html, /js\/app\.js\?v=20260718-1/);
assert.match(script, /overview-utils\.mjs\?v=20260622-21/);
assert.match(script, /history-utils\.mjs\?v=20260622-24/);
assert.match(script, /buildOverviewLegend/);
assert.match(script, /pickVisibleOwnerForDay/);
assert.match(script, /selectedDateIsFuture/);
assert.match(script, /datePickerInput\.max = formatDateInputValue\(today\.getFullYear\(\), toMonthDay\(today\)\)/);
assert.match(script, /Bilde kan legges inn når datoen kommer/);
assert.match(script, /selectedDayHasWord/);
assert.match(script, /addPhotoButton\.disabled = isFutureDate \|\| !hasWord/);
assert.match(script, /Du kan ikke legge inn bilde for en fremtidig dato\./);
assert.match(script, /Fyll inn ordet i ordlisten før du legger til bilde\./);
assert.match(server, /Denne datoen mangler ord\. Fyll inn ordlisten først\./);
assert.match(styles, /\.photo-frame\s*{[^}]*min-height:\s*clamp\(14rem,\s*38vh,\s*25rem\);/s);
assert.match(styles, /\.year-strip\s*{[^}]*min-height:\s*1\.4rem;/s);
assert.match(styles, /\.add-photo-button:disabled,[\s\S]*?\.replace-photo-button:disabled\s*{[^}]*cursor:\s*default;/s);
assert.doesNotMatch(styles, /\.year-strip\s+\.muted\s*{[^}]*display:\s*none;/s);

console.log('Validated separate photo source inputs.');

const delay = () => new Promise(resolve => setTimeout(resolve, 50));
const results = [];
function check(condition, message) { if (!condition) throw new Error(message); results.push(message); }
const input = name => document.querySelector(`input[aria-label="${name}"]`);
async function type(element, value) {
  element.focus(); await delay();
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(element, value);
  element.dispatchEvent(new Event('input', { bubbles: true })); await delay();
}
async function choose(name, query, label) {
  await type(input(name), query);
  const option = Array.from(document.querySelectorAll('[role="option"]')).find(option => option.textContent === label);
  if (!option) throw new Error('Missing choice ' + label + ' for ' + name);
  option.click(); await delay(); input(name)?.blur(); await delay();
}
setTimeout(async () => {
  try {
    check(input('ram').value === '192 GB', 'Existing custom RAM loads from canonical key');
    check(input('batteryCapacity').value === '', 'Legacy percentage is not interpreted as capacity');
    check(!!input('batteryHealth'), 'Apple mobile shows battery health');
    check(!!input('frontCamera') && !!input('rearCamera'), 'Mobile cameras are separate');
    await choose('ram', '12', '12 GB');
    await choose('frontCamera', '12', '12 MP');
    await choose('rearCamera', '50', '50 MP');
    await choose('batteryCapacity', '5000', '5000 mAh');
    document.querySelector('form').requestSubmit(); await delay();
    check(window.savedPayload?.specs?.ram === '12 GB', 'Edited RAM saved under canonical key');
    check(window.savedPayload.specs.frontCamera === '12 MP' && window.savedPayload.specs.rearCamera === '50 MP', 'Both cameras saved');
    check(window.savedPayload.specs.batteryCapacity === '5000 mAh', 'Capacity saved independently');
    check(window.savedPayload.specs['Camera'] === 'Legacy camera description' && window.savedPayload.specs['Battery Percentage'] === '80%' && window.savedPayload.specs['Custom Legacy Field'] === 'Preserve me', 'Legacy and custom specs survive edits');
    await choose('brand', 'samsung', 'Samsung');
    check(!input('batteryHealth'), 'Samsung mobile hides battery health');
    await choose('category', 'head', 'Headphones');
    check(!input('frontCamera'), 'Category change removes mobile fields');
    check(!!input('Connectivity') && !!input('Bluetooth Version') && !!input('Active Noise Cancellation (ANC)'), 'Headphone-specific controls appear');
    await choose('Connectivity', 'Bluetooth', 'Wireless Bluetooth');
    document.querySelector('form').requestSubmit(); await delay();
    check(window.savedPayload.specs.connectivity === 'Wireless Bluetooth', 'Headphone specification saves');
    await choose('category', 'laptop', 'Laptops');
    check(!!input('batteryHealth') && !!input('storageCapacity'), 'Laptop battery and storage controls remain available');
    await type(input('processor'), 'Custom workstation CPU');
    input('processor').blur(); await delay();
    document.querySelector('form').requestSubmit(); await delay();
    check(window.savedPayload.specs.processor === 'Custom workstation CPU', 'Custom specification values remain supported');
    document.body.innerHTML = '<pre id="test-results">PASS: ' + results.length + '\n' + results.join('\n') + '</pre>';
  } catch (error) {
    document.body.innerHTML = '<pre id="test-results">FAIL: ' + error.message + '\n' + results.join('\n') + '</pre>';
  }
}, 150);

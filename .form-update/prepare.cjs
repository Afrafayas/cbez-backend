const fs = require('fs');
const path = require('path');
const ts = require('../node_modules/typescript');
const root = path.resolve(__dirname, '..');
const stage = __dirname;
const converted = new Set(['ram', 'storage', 'storageCapacity', 'processor', 'displaySize', 'batteryHealth', 'batteryCapacity', 'frontCamera', 'rearCamera', 'simType', 'network', 'camera', 'os', 'color', 'condition', 'warranty', 'storageType', 'graphics', 'resolution', 'batteryBackup', 'keyboardLayout', 'simWifi', 'productType', 'compatibility', 'includedItems', 'deviceAge', 'model', 'brand']);
function write(app, relative, content) {
  const target = path.join(stage, app, 'src', relative);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content);
}
for (const app of ['cbez-admin', 'cbez-frontend']) {
  const admin = app === 'cbez-admin';
  let source = fs.readFileSync(path.resolve(root, '..', app, 'src/components/AddEditProductModal.tsx'), 'utf8');
  fs.writeFileSync(path.join(stage, `${app}.original.tsx`), source);
  source = source.replace(/\r\n/g, '\n');
  source = "import { SearchableSelect } from './SearchableSelect';\nimport { AdditionalSpecifications } from './AdditionalSpecifications';\nimport { formSpecifications, formOptions, fieldAliases, representedFields, fieldVisible, editableSpecifications } from '../utils/productFormOptions';\n" + source;
  source = source.replace('const sp = prod.specs || {};', 'const sp = editableSpecifications(prod.specs || {});').replace('const sp = productToEdit.specs || {};', 'const sp = editableSpecifications(productToEdit.specs || {});');
  // A battery percentage is not a capacity: load capacity only from its own keys.
  source = source.replace(/^(\s*)batteryPercentage: .*$/gm, (line, indent) => `${indent}batteryCapacity: ${line.includes("sp[") ? "sp['Battery Capacity'] || sp['batteryCapacity'] || ''," : line.includes('productForm.') ? 'productForm.batteryCapacity,' : "'',"}`);
  source = source.replaceAll('productForm.batteryPercentage', 'productForm.batteryCapacity').replaceAll('batteryPercentage: e.target.value', 'batteryCapacity: e.target.value');
  source = source.replaceAll("'Battery Percentage': productForm.batteryCapacity", "'Battery Capacity': productForm.batteryCapacity");
  source = source.replaceAll('batteryPercentage: productForm.batteryCapacity', 'batteryCapacity: productForm.batteryCapacity');
  source = source.replaceAll('Battery Percentage', 'Battery Capacity (mAh)').replaceAll('placeholder="e.g. 100%, 98%"', 'placeholder="e.g. 5000 mAh"');
  source = source.replace('placeholder="e.g. 100% / 5000 mAh"', 'placeholder="e.g. 5000 mAh"');
  // Keep the old aggregate camera only for tablets and existing legacy product specs.
  source = source.replace(/^(\s*)camera: .*$/gm, (line, indent) => `${line}\n${indent}frontCamera: ${line.includes("sp[") ? "sp['Front Camera'] || sp['frontCamera'] || ''," : line.includes('productForm.') ? 'productForm.frontCamera,' : "'',"}\n${indent}rearCamera: ${line.includes("sp[") ? "sp['Rear Camera'] || sp['rearCamera'] || ''," : line.includes('productForm.') ? 'productForm.rearCamera,' : "'',"}`);
  source = source.replace("'Camera': productForm.camera,", "'Front Camera': productForm.frontCamera,\n        'Rear Camera': productForm.rearCamera,");
  // Treat cameras and consoles as accessories, rather than showing mobile fields.
  if (admin) source = source.replace("lower.includes('gadget')", "lower.includes('gadget') || lower.includes('camera') || lower.includes('photo') || lower.includes('gaming') || lower.includes('console')");
  if (!admin) {
    source = source.replace("const [dbCategories, setDbCategories] = useState<string[]>([]);", "const [dbCategories, setDbCategories] = useState<string[]>([]);\n  const [categoryDefinitions, setCategoryDefinitions] = useState<{ name: string; specConfig?: unknown }[]>([]);");
    source = source.replace('setDbCategories(fetchedCats.map(c => c.name));', 'setDbCategories(fetchedCats.map(c => c.name));\n          setCategoryDefinitions(fetchedCats);');
  }
  const definition = admin ? 'categories' : 'categoryDefinitions';
  const marker = '  const currentCategoryGroup = getCategoryGroup(productForm.category);';
  source = source.replace(marker, `${marker}
  const isAppleMobile = currentCategoryGroup === 'mobile' && productForm.brand.trim().toLowerCase() === 'apple';
  const specificationFields = formSpecifications(productForm.category, ${definition}.find(category => category.name === productForm.category)?.specConfig);
  const [additionalSpecs, setAdditionalSpecs] = useState<Record<string, string>>({});
  useEffect(() => { setAdditionalSpecs({ ...(productToEdit?.specs || {}) }); }, [productToEdit, ${admin ? 'isOpen' : 'showAddEditModal'}]);
  const optionsFor = (key: string) => key === 'brand' ? ${admin ? "Array.from(new Set(['Apple', 'Samsung', 'Google', 'OnePlus', 'Xiaomi', 'HP', 'Dell', 'Lenovo', 'Asus', 'Sony', ...brands.map(brand => brand.name)]))" : 'availableBrandsList'} : formOptions(key, specificationFields);
`);
  // Use the syntax tree to change only field controls and their containing groups.
  let ast = ts.createSourceFile('form.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const edits = [];
  let mobileCameraDone = false, mobileHealthDone = false;
  function text(node) { return source.slice(node.getStart(ast), node.end); }
  function attr(node, name) { return node.attributes.properties.find(p => p.name?.getText(ast) === name); }
  function visit(node) {
    if (ts.isJsxElement(node) && node.openingElement.tagName.getText(ast) === 'div') {
      const own = text(node);
      // Simple field groups contain no nested divs.
      if (!own.slice(4).includes('<div')) {
        if (!mobileCameraDone && /value=\{productForm.camera\}/.test(own)) {
          mobileCameraDone = true;
          const front = own.replaceAll('productForm.camera', 'productForm.frontCamera').replaceAll('camera: e.target.value', 'frontCamera: e.target.value').replace(/Camera Specs|Camera(?=<\/label>)/g, 'Front Camera').replace(/placeholder="[^"]*"/, 'placeholder="Select or enter front camera"').replace(/\n\s*required\b/, '');
          const rear = front.replaceAll('Front Camera', 'Rear Camera').replaceAll('frontCamera', 'rearCamera').replace('front camera', 'rear camera');
          edits.push([node.getStart(ast), node.end, front + '\n' + rear]);
          return;
        }
        if (!mobileHealthDone && /value=\{productForm.batteryHealth\}/.test(own)) {
          mobileHealthDone = true;
          edits.push([node.getStart(ast), node.end, '{isAppleMobile && (' + own + ')}']);
          return;
        }
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(ast);
  edits.sort((a,b) => b[0] - a[0]).forEach(([start,end,value]) => { source = source.slice(0,start) + value + source.slice(end); });
  // Second pass converts existing selects and specification inputs, keeping handlers/styles.
  ast = ts.createSourceFile('form.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  edits.length = 0;
  function controls(node) {
    if (ts.isJsxElement(node) && node.openingElement.tagName.getText(ast) === 'select') {
      const opening = node.openingElement;
      const key = attr(opening, 'value')?.getText(ast).match(/productForm\.(\w+)/)?.[1];
      let own = text(node).replace('<select', `<SearchableSelect allowCustomValue={${key && key !== 'category' ? 'true' : 'false'}}${key ? ` options={optionsFor('${key}')} aria-label="${key}"` : ' aria-label="Dealer shop"'}`).replace('</select>', '</SearchableSelect>');
      edits.push([node.getStart(ast), node.end, own]);
      return;
    }
    if (ts.isJsxSelfClosingElement(node) && node.tagName.getText(ast) === 'input') {
      const key = attr(node, 'value')?.getText(ast).match(/productForm\.(\w+)/)?.[1];
      if (converted.has(key)) {
        let own = text(node).replace('<input', `<SearchableSelect options={optionsFor('${key}')} aria-label="${key}"`).replace(/\s+type="[^"]*"/, '').replace(/\s+list="[^"]*"/, '');
        edits.push([node.getStart(ast), node.end, own]);
      }
    }
    ts.forEachChild(node, controls);
  }
  controls(ast);
  edits.sort((a,b) => b[0] - a[0]).forEach(([start,end,value]) => { source = source.slice(0,start) + value + source.slice(end); });
  // Merge instead of dropping unrepresented and legacy specifications on edits.
  const merge = `
    const mergedSpecs: Record<string, string> = { ...(productToEdit?.specs || {}), ...categorySpecs };
    if (currentCategoryGroup === 'mobile' && !isAppleMobile) {
      if (productToEdit?.specs?.['Battery Health'] === undefined) delete mergedSpecs['Battery Health'];
      else mergedSpecs['Battery Health'] = productToEdit.specs['Battery Health'];
    }
    for (const field of specificationFields) {
      if (!fieldVisible(field, productForm.brand)) continue;
      const formKey = Object.keys(fieldAliases).find(key => fieldAliases[key] === field.key && (key !== 'storageCapacity' || currentCategoryGroup === 'laptop')) || field.key;
      const extra = !representedFields(currentCategoryGroup).includes(field.key);
      const value = extra ? (additionalSpecs[field.key] ?? additionalSpecs[field.label]) : (productForm as unknown as Record<string, string>)[formKey];
      if (value !== undefined) { mergedSpecs[field.key] = value; mergedSpecs[field.label] = value; }
    }
    categorySpecs = mergedSpecs;
`;
  source = source.replace(admin ? '    const payload: any = {' : '    const productPayload: Product = {', merge + (admin ? '    const payload: any = {' : '    const productPayload: Product = {'));
  const extraPanel = `<AdditionalSpecifications fields={specificationFields} group={currentCategoryGroup} brand={productForm.brand} values={additionalSpecs} onChange={(key, value) => setAdditionalSpecs(previous => ({ ...previous, [key]: value }))} ${admin ? 'dark' : ''} />`;
  source = source.replace(admin ? '          <div className="col-span-2 flex items-center justify-end' : '          {/* Condition & Warranty Row */}', admin ? `          ${extraPanel}\n          <div className="col-span-2 flex items-center justify-end` : `          ${extraPanel}\n          {/* Condition & Warranty Row */}`);
  // Avoid imposing new camera requirements on older products during edit.
  if (!mobileCameraDone || !mobileHealthDone) throw new Error('Missing mobile field groups: ' + app);
  write(app, 'components/AddEditProductModal.tsx', source);
  for (const file of ['SearchableSelect.tsx', 'AdditionalSpecifications.tsx']) write(app, 'components/' + file, fs.readFileSync(path.join(stage, file), 'utf8'));
  write(app, 'utils/productFormOptions.ts', fs.readFileSync(path.join(stage, 'productFormOptions.ts'), 'utf8'));
  write(app, 'utils/categorySpecifications.ts', fs.readFileSync(path.join(root, 'src/categories/category-specifications.ts'), 'utf8'));
  if (!admin) {
    let types = fs.readFileSync(path.resolve(root, '..', app, 'src/types.ts'), 'utf8');
    types = types.replace('export interface Category {', "export interface Category {\n  specConfig?: import('./utils/categorySpecifications').SpecificationField[];");
    types = types.replace('  batteryPercentage?: string;', '  batteryPercentage?: string;\n  batteryCapacity?: string;\n  frontCamera?: string;\n  rearCamera?: string;');
    write(app, 'types.ts', types);
  }
}
console.log('Prepared both applications under .form-update.');

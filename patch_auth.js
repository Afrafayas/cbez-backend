const fs = require('fs');
const path = 'src/auth/auth.service.ts';
let code = fs.readFileSync(path, 'utf8');

if (!code.includes('identifier')) {
  code = code.replace(
    'if (dto.email) {',
    'const identifier = (dto.email || dto.phone || "").trim();\n    if (identifier) {\n      user = await this.prisma.user.findFirst({\n        where: {\n          OR: [\n            { email: identifier.toLowerCase() },\n            { phone: identifier },\n            { name: { equals: identifier, mode: "insensitive" } },\n          ],\n        },\n        include: { shop: true },\n      });\n    } else if (false) {'
  );
  fs.writeFileSync(path, code, 'utf8');
  console.log('PATCHED');
} else {
  console.log('ALREADY_PATCHED');
}

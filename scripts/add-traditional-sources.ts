/**
 * Agrega software tradicional de referencia al registro de fuentes.
 *
 * NO ingiere ni verifica nada: solo registra productos/documentos con sus URLs
 * oficiales en estado `needs_manual_review`. La verificación real la hace
 * `npm run sources:verify` (2xx + dominio oficial) y la ingesta, `npm run ingest:*`.
 * No se inventan documentos ni se infiere contenido.
 *
 * Uso: npx tsx scripts/add-traditional-sources.ts
 */

import { loadRegistry, saveRegistry, type SourceDocument, type Product, type Provider } from "../src/lib/sources";

const ACADEMIC_NOTE = "Producto incorporado como punto de comparación frente a proveedores de IA.";

function doc(
  documentId: string,
  documentType: string,
  sourceUrl: string,
  opts: { sourceScope?: "general" | "mixed"; notes?: string } = {},
): SourceDocument {
  return {
    documentId,
    documentType,
    contractingMode: "all",
    appliesToModes: [],
    sourceScope: opts.sourceScope ?? "general",
    sourceUrl,
    sourceStatus: "needs_manual_review",
    lastCheckedAt: null,
    httpStatus: null,
    finalUrl: null,
    notes: opts.notes ?? "Software tradicional de referencia. Pendiente de verificación e ingesta.",
  };
}

async function main() {
  const reg = await loadRegistry();
  const byId = new Map(reg.providers.map((p) => [p.providerId, p]));

  const upsertProduct = (providerId: string, product: Omit<Product, "productNiche">) => {
    const prov = byId.get(providerId);
    if (!prov) throw new Error(`proveedor no encontrado: ${providerId}`);
    if (prov.products.some((p) => p.productId === product.productId)) {
      console.log(`  = ${providerId}/${product.productId} ya existe; se omite`);
      return;
    }
    // Software tradicional de referencia -> nicho "everyday_software" por defecto.
    prov.products.push({ productNiche: "everyday_software", ...product } as Product);
    console.log(`  + ${providerId}/${product.productId} (${product.softwareCategory})`);
  };

  const ensureProvider = (input: Omit<Provider, "providerRegion" | "providerType">) => {
    if (byId.has(input.providerId)) return byId.get(input.providerId)!;
    // Región/tipo por defecto "unknown"; se curan luego en el registro.
    const p = { providerRegion: "unknown", providerType: "unknown", ...input } as Provider;
    reg.providers.push(p);
    byId.set(p.providerId, p);
    console.log(`  + proveedor ${p.providerId}`);
    return p;
  };

  const ensureDomain = (providerId: string, domain: string) => {
    const prov = byId.get(providerId);
    if (prov && !prov.officialDomains.includes(domain)) prov.officialDomains.push(domain);
  };

  // --- Google: Gmail (email) + Android (mobile OS) bajo el proveedor existente ---
  upsertProduct("google", {
    productId: "gmail",
    productName: "Gmail",
    tiers: ["Free", "Workspace"],
    softwareCategory: "email",
    comparisonGroup: "traditional_software",
    comparativeBaseline: true,
    academicPurposeNotes: ACADEMIC_NOTE,
    documents: [
      doc("terms-of-service", "Terms of Service", "https://policies.google.com/terms", {
        sourceScope: "general",
        notes: "Términos generales de Google (aplican a Gmail). Alcance general del ecosistema; revisar manualmente.",
      }),
      doc("privacy-policy", "Privacy Policy", "https://policies.google.com/privacy", {
        sourceScope: "general",
        notes: "Política de privacidad general de Google (aplica a Gmail). Revisar manualmente.",
      }),
    ],
  });
  upsertProduct("google", {
    productId: "android",
    productName: "Android",
    tiers: [],
    softwareCategory: "mobile_operating_system",
    comparisonGroup: "mobile_ecosystem",
    comparativeBaseline: true,
    academicPurposeNotes: ACADEMIC_NOTE,
    documents: [
      doc("terms-of-service", "Google Terms of Service", "https://policies.google.com/terms", {
        sourceScope: "mixed",
        notes: "El ecosistema Android no surge de un documento específico; se usan términos generales de Google. Alcance dudoso: requiere revisión manual.",
      }),
      doc("privacy-policy", "Privacy Policy", "https://policies.google.com/privacy", {
        sourceScope: "mixed",
        notes: "Privacidad general de Google aplicable a Android. Alcance dudoso: requiere revisión manual.",
      }),
    ],
  });

  // --- Microsoft 365 (productivity) bajo el proveedor existente ---
  ensureDomain("microsoft", "microsoft.com");
  upsertProduct("microsoft", {
    productId: "microsoft-365",
    productName: "Microsoft 365",
    tiers: ["Personal", "Business", "Enterprise"],
    softwareCategory: "productivity_suite",
    comparisonGroup: "traditional_software",
    comparativeBaseline: true,
    academicPurposeNotes: ACADEMIC_NOTE,
    documents: [
      doc("services-agreement", "Microsoft Services Agreement", "https://www.microsoft.com/en-us/servicesagreement/", {
        notes: "Acuerdo de servicios de Microsoft (cubre Microsoft 365 de consumo). Revisar alcance por modalidad.",
      }),
      doc("privacy-statement", "Privacy Statement", "https://privacy.microsoft.com/en-us/privacystatement", {
        notes: "Declaración de privacidad de Microsoft. Revisar manualmente.",
      }),
    ],
  });

  // --- LinkedIn (red social) ---
  ensureProvider({
    providerId: "linkedin",
    providerName: "LinkedIn",
    officialDomains: ["linkedin.com"],
    products: [],
    metadata: { needsManualSourceReview: true, notes: "Red social profesional incorporada como punto de comparación académico." },
  });
  upsertProduct("linkedin", {
    productId: "linkedin",
    productName: "LinkedIn",
    tiers: ["Free", "Premium"],
    softwareCategory: "social_network",
    comparisonGroup: "social_platform",
    comparativeBaseline: true,
    academicPurposeNotes: ACADEMIC_NOTE,
    documents: [
      doc("user-agreement", "User Agreement", "https://www.linkedin.com/legal/user-agreement"),
      doc("privacy-policy", "Privacy Policy", "https://www.linkedin.com/legal/privacy-policy"),
    ],
  });

  // --- X / x.com (red social) ---
  ensureProvider({
    providerId: "x",
    providerName: "X",
    officialDomains: ["x.com", "twitter.com"],
    products: [],
    metadata: { needsManualSourceReview: true, notes: "Red social incorporada como punto de comparación académico." },
  });
  upsertProduct("x", {
    productId: "x",
    productName: "X",
    tiers: ["Free", "Premium"],
    softwareCategory: "social_network",
    comparisonGroup: "social_platform",
    comparativeBaseline: true,
    academicPurposeNotes: ACADEMIC_NOTE,
    documents: [
      doc("terms-of-service", "Terms of Service", "https://x.com/en/tos"),
      doc("privacy-policy", "Privacy Policy", "https://x.com/en/privacy"),
    ],
  });

  // --- Apple / iOS (ecosistema móvil) ---
  ensureProvider({
    providerId: "apple",
    providerName: "Apple",
    officialDomains: ["apple.com"],
    products: [],
    metadata: { needsManualSourceReview: true, notes: "Ecosistema móvil incorporado como punto de comparación académico." },
  });
  upsertProduct("apple", {
    productId: "apple-ios",
    productName: "Apple devices / iOS",
    tiers: [],
    softwareCategory: "mobile_device_ecosystem",
    comparisonGroup: "mobile_ecosystem",
    comparativeBaseline: true,
    academicPurposeNotes: ACADEMIC_NOTE,
    documents: [
      doc("privacy-policy", "Apple Privacy Policy", "https://www.apple.com/legal/privacy/", {
        notes: "Política de privacidad de Apple. Aplicable al ecosistema; revisar manualmente.",
      }),
      doc("media-services-terms", "Apple Media Services Terms", "https://www.apple.com/legal/internet-services/itunes/", {
        sourceScope: "mixed",
        notes: "Términos de servicios de Apple. Los términos de iOS/dispositivo no surgen de un documento único claro: alcance dudoso, requiere revisión manual.",
      }),
    ],
  });

  await saveRegistry(reg);
  console.log("\nRegistro actualizado.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

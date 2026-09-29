// ============================================================
// MODULE: STOCK
// UTIL: bonCommande.generator
// Génère le PDF du bon de commande sur une page A4 avec PDFKit.
// ============================================================

const PDFDocument = require('pdfkit');

/**
 * Génère un Buffer PDF du bon de commande.
 *
 * @param {Object} params
 * @param {Object}   params.fournisseur  - objet fournisseur (peut être null)
 * @param {Array}    params.lignes       - tableau de lignes { reference, nom, quantite, prixUnitaire, total }
 * @param {number}   params.totalHT      - total hors taxe
 * @param {string}   params.etablissement - nom de l'établissement
 * @param {string}   params.numero       - numéro du bon de commande
 * @returns {Promise<Buffer>}
 */
const generateBonCommandePDF = (params) => {
  return new Promise((resolve, reject) => {
    const {
      fournisseur,
      lignes,
      totalHT,
      etablissement = 'Établissement Scolaire',
      numero = `BC-${Date.now()}`,
    } = params;

    const doc    = new PDFDocument({ size: 'A4', margin: 45, compress: true });
    const chunks = [];

    doc.on('data',  (c) => chunks.push(c));
    doc.on('end',   () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const W       = doc.page.width  - doc.page.margins.left - doc.page.margins.right;
    const ML      = doc.page.margins.left;
    const COLORS  = { primary: '#1d9e75', dark: '#1a1a2e', muted: '#6b7280', border: '#e5e7eb', danger: '#e24b4a' };
    const today   = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });

    // #REGION header

    // Bande verte de titre
    doc.rect(ML, 45, W, 52).fill(COLORS.primary);
    doc.fillColor('#fff').font('Helvetica-Bold').fontSize(18).text('BON DE COMMANDE', ML + 12, 58);
    doc.font('Helvetica').fontSize(10).text(`N° ${numero}`, ML + 12, 80);
    doc.font('Helvetica').fontSize(10).text(today, ML + W - 120, 80);

    let y = 115;

    // Émetteur / destinataire
    doc.fillColor(COLORS.dark).font('Helvetica-Bold').fontSize(9).text('ÉMETTEUR', ML, y);
    doc.font('Helvetica-Bold').fontSize(9).text('FOURNISSEUR', ML + W / 2, y);

    y += 14;
    doc.font('Helvetica').fontSize(10).fillColor(COLORS.dark).text(etablissement, ML, y);

    if (fournisseur) {
      doc.font('Helvetica-Bold').fontSize(10).text(fournisseur.nom, ML + W / 2, y);
      let fy = y + 14;
      if (fournisseur.contact)   { doc.font('Helvetica').fontSize(9).fillColor(COLORS.muted).text(fournisseur.contact, ML + W / 2, fy); fy += 12; }
      if (fournisseur.email)     { doc.font('Helvetica').fontSize(9).text(fournisseur.email, ML + W / 2, fy); fy += 12; }
      if (fournisseur.telephone) { doc.font('Helvetica').fontSize(9).text(fournisseur.telephone, ML + W / 2, fy); fy += 12; }
      if (fournisseur.delaiLivraisonJ) {
        doc.font('Helvetica').fontSize(9).fillColor(COLORS.primary)
          .text(`Délai de livraison : ${fournisseur.delaiLivraisonJ} jour(s)`, ML + W / 2, fy);
      }
    } else {
      doc.font('Helvetica').fontSize(10).fillColor(COLORS.muted).text('(aucun fournisseur sélectionné)', ML + W / 2, y);
    }

    y += 60;

    // Séparateur
    doc.moveTo(ML, y).lineTo(ML + W, y).strokeColor(COLORS.border).lineWidth(0.5).stroke();
    y += 12;

    // #ENDREGION header

    // #REGION table

    const COL = {
      ref:  { x: ML,           w: 80  },
      nom:  { x: ML + 80,      w: W - 80 - 70 - 60 - 65 },
      qte:  { x: ML + W - 195, w: 70  },
      pu:   { x: ML + W - 125, w: 60  },
      tot:  { x: ML + W - 65,  w: 65  },
    };

    // En-têtes de colonne
    doc.rect(ML, y, W, 20).fill('#f3f4f6');
    doc.fillColor(COLORS.dark).font('Helvetica-Bold').fontSize(8);
    doc.text('Référence',   COL.ref.x + 4, y + 6,  { width: COL.ref.w });
    doc.text('Désignation', COL.nom.x + 4, y + 6,  { width: COL.nom.w });
    doc.text('Qté',         COL.qte.x,     y + 6,  { width: COL.qte.w, align: 'center' });
    doc.text('P.U. HT',     COL.pu.x,      y + 6,  { width: COL.pu.w,  align: 'right' });
    doc.text('Total HT',    COL.tot.x,     y + 6,  { width: COL.tot.w, align: 'right' });

    y += 20;

    // Lignes du tableau
    lignes.forEach((ligne, idx) => {
      const rowH = 22;
      const bg   = idx % 2 === 0 ? '#ffffff' : '#f9fafb';

      doc.rect(ML, y, W, rowH).fill(bg);

      doc.fillColor(COLORS.muted).font('Helvetica').fontSize(8)
        .text(ligne.reference, COL.ref.x + 4, y + 7, { width: COL.ref.w, ellipsis: true });

      doc.fillColor(COLORS.dark).font('Helvetica').fontSize(9)
        .text(ligne.nom, COL.nom.x + 4, y + 7, { width: COL.nom.w - 8, ellipsis: true });

      doc.fillColor(COLORS.primary).font('Helvetica-Bold').fontSize(9)
        .text(String(ligne.quantite), COL.qte.x, y + 7, { width: COL.qte.w, align: 'center' });

      doc.fillColor(COLORS.dark).font('Helvetica').fontSize(9)
        .text(`${ligne.prixUnitaire.toFixed(2)} €`, COL.pu.x, y + 7, { width: COL.pu.w, align: 'right' });

      doc.fillColor(COLORS.dark).font('Helvetica-Bold').fontSize(9)
        .text(`${ligne.total.toFixed(2)} €`, COL.tot.x, y + 7, { width: COL.tot.w, align: 'right' });

      // Bordure basse légère
      doc.moveTo(ML, y + rowH).lineTo(ML + W, y + rowH).strokeColor(COLORS.border).lineWidth(0.3).stroke();
      y += rowH;
    });

    // #ENDREGION table

    // #REGION totaux

    y += 8;
    const totH = 28;
    doc.rect(ML + W - 200, y, 200, totH).fill(COLORS.primary);
    doc.fillColor('#fff').font('Helvetica').fontSize(10).text('TOTAL H.T.', ML + W - 195, y + 8);
    doc.font('Helvetica-Bold').fontSize(12).text(`${totalHT.toFixed(2)} €`, ML + W - 195, y + 8, { width: 185, align: 'right' });

    y += totH + 20;

    // #ENDREGION totaux

    // #REGION footer

    // Zone signature
    const sigW = (W - 20) / 2;
    doc.rect(ML,            y, sigW, 55).stroke(COLORS.border);
    doc.rect(ML + sigW + 20, y, sigW, 55).stroke(COLORS.border);

    doc.fillColor(COLORS.muted).font('Helvetica').fontSize(8)
      .text('Visa Responsable', ML + 10, y + 5);
    doc.fillColor(COLORS.muted).font('Helvetica').fontSize(8)
      .text('Visa Fournisseur', ML + sigW + 30, y + 5);

    y += 75;

    // Ligne bas de page
    doc.moveTo(ML, y).lineTo(ML + W, y).strokeColor(COLORS.border).lineWidth(0.5).stroke();
    doc.fillColor(COLORS.muted).font('Helvetica').fontSize(7)
      .text(`Document généré le ${today} — GMAO ${etablissement}`, ML, y + 5, { width: W, align: 'center' });

    // #ENDREGION footer

    doc.end();
  });
};

module.exports = { generateBonCommandePDF };

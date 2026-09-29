<template>
  <!-- ====================================================
    MODULE: DASHBOARD — KpiCard
    Carte indicateur clé : valeur + libellé + couleur + lien.
    Pulse rouge si highlight = true.
  ==================================================== -->
  <component
    :is="link && !disabled ? 'router-link' : 'div'"
    :to="link"
    class="kpi-card"
    :class="[
      `kpi-${color}`,
      { 'kpi-highlight': highlight && !disabled, 'kpi-disabled': disabled }
    ]"
    :title="tooltip"
    :aria-label="`${label} : ${value}${disabled ? ' ('+disabledLabel+')' : ''}`"
  >
    <!-- Icône -->
    <div class="kpi-icon-wrap">
      <i :class="`ti ${icon}`" class="kpi-icon" aria-hidden="true"></i>
    </div>

    <!-- Valeur -->
    <div class="kpi-body">
      <div class="kpi-value">
        <span class="kpi-num" :class="{ 'kpi-zero': value === 0 }">{{ value }}</span>
        <span v-if="disabled" class="kpi-coming" :title="tooltip">{{ disabledLabel }}</span>
      </div>
      <div class="kpi-label">{{ label }}</div>
    </div>

    <!-- Pulse pour alertes critiques -->
    <span v-if="highlight" class="kpi-pulse" aria-hidden="true"></span>

    <!-- Flèche de navigation -->
    <i v-if="link && !disabled" class="ti ti-chevron-right kpi-arrow" aria-hidden="true"></i>
  </component>
</template>

<script setup>
defineProps({
  icon:          { type: String,  required: true },
  label:         { type: String,  required: true },
  value:         { type: Number,  default:  0 },
  color:         { type: String,  default:  'primary' }, // primary | success | warning | danger | info
  highlight:     { type: Boolean, default:  false },
  link:          { type: String,  default:  null },
  tooltip:       { type: String,  default:  '' },
  disabled:      { type: Boolean, default:  false },
  disabledLabel: { type: String,  default:  'Bientôt' },
})
</script>

<style scoped>
.kpi-card {
  position: relative;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 14px;
  background: #16181f;
  border: 1px solid #2a2d38;
  border-radius: 12px;
  text-decoration: none;
  overflow: hidden;
  transition: border-color 0.15s, transform 0.1s;
  min-height: 76px;
}

a.kpi-card:hover   { border-color: currentColor; transform: translateY(-1px); }
a.kpi-card:focus-visible { outline: 2px solid #1d9e75; outline-offset: 2px; }
.kpi-disabled { opacity: 0.55; cursor: not-allowed; }

/* Bande colorée gauche */
.kpi-card::before {
  content: '';
  position: absolute;
  left: 0; top: 0; bottom: 0;
  width: 3px;
  border-radius: 3px 0 0 3px;
  background: currentColor;
}

/* Couleurs par type */
.kpi-primary { color: #1d9e75; }
.kpi-success { color: #5DCAA5; }
.kpi-info    { color: #B5D4F4; }
.kpi-warning { color: #EF9F27; }
.kpi-danger  { color: #e24b4a; }

/* Icône */
.kpi-icon-wrap {
  width: 38px; height: 38px; border-radius: 10px;
  background: rgba(255,255,255,0.04);
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.kpi-icon { font-size: 18px; color: inherit; }

/* Corps */
.kpi-body { flex: 1; min-width: 0; }
.kpi-value { display: flex; align-items: baseline; gap: 6px; }
.kpi-num   { font-size: 24px; font-weight: 700; color: #e8e8e8; line-height: 1; }
.kpi-zero  { color: #6b7280; }
.kpi-label { font-size: 11px; color: #9ca3af; margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.kpi-coming { font-size: 10px; color: #6b7280; background: #1e2030; padding: 1px 6px; border-radius: 10px; border: 1px solid #2a2d38; }

.kpi-arrow { font-size: 14px; color: #3d4151; flex-shrink: 0; }
a.kpi-card:hover .kpi-arrow { color: #9ca3af; }

/* Pulse pour alertes */
.kpi-pulse {
  position: absolute;
  top: 10px; right: 10px;
  width: 8px; height: 8px;
  border-radius: 50%;
  background: currentColor;
}
.kpi-pulse::before {
  content: '';
  position: absolute;
  inset: -3px;
  border-radius: 50%;
  background: currentColor;
  opacity: 0;
  animation: pulse 2s ease infinite;
}
@keyframes pulse {
  0%   { transform: scale(0.9); opacity: 0.6; }
  70%  { transform: scale(1.8); opacity: 0; }
  100% { transform: scale(0.9); opacity: 0; }
}

/* Highlight fort pour danger */
.kpi-highlight.kpi-danger  { border-color: rgba(226,75,74,0.4); background: rgba(226,75,74,0.06); }
.kpi-highlight.kpi-warning { border-color: rgba(239,159,39,0.3); background: rgba(239,159,39,0.05); }
</style>

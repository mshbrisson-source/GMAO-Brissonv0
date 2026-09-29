<template>
  <!-- ====================================================
    MODULE: DASHBOARD — DonutChart
    Graphique SVG donut pur, sans librairie externe.
    segments : [{ label, count, color }]
  ==================================================== -->
  <div class="donut-wrapper" :aria-label="`Graphique donut : ${title}`">
    <svg
      :viewBox="`0 0 ${SIZE} ${SIZE}`"
      class="donut-svg"
      role="img"
      :aria-label="title"
    >
      <!-- Cercle de fond -->
      <circle
        :cx="CX" :cy="CY" :r="R"
        fill="none"
        stroke="#1e2030"
        :stroke-width="THICKNESS"
      />

      <!-- Segments -->
      <circle
        v-for="(seg, i) in computedSegments"
        :key="i"
        :cx="CX" :cy="CY" :r="R"
        fill="none"
        :stroke="seg.color"
        :stroke-width="THICKNESS"
        :stroke-dasharray="`${seg.dash} ${CIRCUMFERENCE - seg.dash}`"
        :stroke-dashoffset="seg.offset"
        stroke-linecap="butt"
        class="donut-seg"
        :style="{ transition: 'stroke-dasharray 0.6s ease' }"
      >
        <title>{{ seg.label }} : {{ seg.count }} ({{ seg.pct }}%)</title>
      </circle>

      <!-- Label central -->
      <text :x="CX" :y="CY - 8" text-anchor="middle" class="center-val">{{ total }}</text>
      <text :x="CX" :y="CY + 12" text-anchor="middle" class="center-lbl">{{ subtitle }}</text>
    </svg>

    <!-- Légende -->
    <ul class="donut-legend" aria-label="Légende du graphique">
      <li v-for="seg in computedSegments" :key="seg.label" class="legend-item">
        <span class="legend-dot" :style="{ background: seg.color }"></span>
        <span class="legend-label">{{ seg.label }}</span>
        <span class="legend-count">{{ seg.count }}</span>
        <span class="legend-pct">{{ seg.pct }}%</span>
      </li>
    </ul>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  segments: { type: Array,  default: () => [] },
  title:    { type: String, default: 'Graphique donut' },
  subtitle: { type: String, default: 'total' },
})

const SIZE      = 180
const CX        = SIZE / 2
const CY        = SIZE / 2
const R         = 68
const THICKNESS = 22
const CIRCUMFERENCE = 2 * Math.PI * R
const GAP = 2 // gap entre segments en px de circumférence

const total = computed(() => props.segments.reduce((s, seg) => s + seg.count, 0))

const computedSegments = computed(() => {
  const t = total.value
  if (t === 0) return []

  let offset = CIRCUMFERENCE * 0.25 // départ à 12h (rotation -90°)
  const rotate = -90

  return props.segments.map(seg => {
    const pct  = Math.round((seg.count / t) * 100)
    const dash = Math.max(0, (seg.count / t) * CIRCUMFERENCE - GAP)
    const seg_ = { ...seg, pct, dash, offset: -offset + CIRCUMFERENCE * 0.25 }
    offset    -= (seg.count / t) * CIRCUMFERENCE
    return seg_
  })
})
</script>

<style scoped>
.donut-wrapper { display: flex; flex-direction: column; align-items: center; gap: 14px; width: 100%; }
.donut-svg { width: 160px; height: 160px; flex-shrink: 0; transform: rotate(-90deg); }
.donut-seg { transition: opacity 0.15s; }
.donut-seg:hover { opacity: 0.8; }

.center-val {
  font-size: 28px; font-weight: 700;
  fill: var(--center-fill, #e8e8e8);
  transform: rotate(90deg);
  transform-origin: 90px 90px;
  font-family: inherit;
}
.center-lbl {
  font-size: 11px;
  fill: #6b7280;
  transform: rotate(90deg);
  transform-origin: 90px 90px;
  font-family: inherit;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.donut-legend {
  list-style: none; padding: 0; margin: 0;
  display: flex; flex-direction: column; gap: 5px; width: 100%;
}
.legend-item {
  display: flex; align-items: center; gap: 7px;
  font-size: 12px; padding: 2px 0;
}
.legend-dot   { width: 8px; height: 8px; border-radius: 2px; flex-shrink: 0; }
.legend-label { flex: 1; color: #c9cad1; }
.legend-count { color: #e8e8e8; font-weight: 500; min-width: 20px; text-align: right; }
.legend-pct   { color: #6b7280; min-width: 36px; text-align: right; }
</style>

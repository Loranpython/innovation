/*
  body-anatomy.js — subtle anatomy overlay on the body map (bones, muscles,
  organs). Ported from the teammate's prototype (body-anatomy.tsx).

  These are schematic orientation landmarks for nurses and curious patients,
  NOT a diagnostic drawing. They are faint and ignore taps
  (pointer-events: none in pain.css), so the figure still reads as a simple
  body silhouette.

  Set SHOW_ANATOMY to false to hide the overlay everywhere.
*/

export const SHOW_ANATOMY = true;

/** SVG markup (a <g> string) for the anatomy of "front" or "back". */
export function anatomyMarkup(view) {
  if (!SHOW_ANATOMY) return "";

  // Ribs: 5 pairs, slightly narrower towards the bottom.
  const ribs = [132, 142, 152, 162, 172].map((y, i) => {
    const x1 = 89 + i * 2;
    const x2 = 151 - i * 2;
    return `M116 ${y}C104 ${y - 5} ${x1} ${y - 8} ${x1} ${y + 1}C${x1} ${y + 9} 106 ${y + 12} 116 ${y + 7} ` +
      `M124 ${y}C136 ${y - 5} ${x2} ${y - 8} ${x2} ${y + 1}C${x2} ${y + 9} 134 ${y + 12} 124 ${y + 7}`;
  }).join(" ");
  // Vertebrae: 18 short lines down the spine.
  const vertebrae = Array.from({ length: 18 }, (_, i) => `M117 ${125 + i * 7}h6`).join(" ");

  // Bones on both views: pelvis, arm and leg bones.
  const sharedBones = `
      <path d="M114 255C104 250 89 249 85 266C82 277 91 292 101 291C108 291 114 277 120 273C126 277 132 291 139 291C149 292 158 277 155 266C151 249 136 250 126 255 M114 255Q114 268 120 273Q126 268 126 255"/>
      <path d="M65 137L53 197 M175 137L187 197 M51 211L36 265 M57 211L43 266 M189 211L204 265 M183 211L197 266 M94 303L96 398 M146 303L144 398 M91 430L92 514 M101 430L97 510 M149 430L148 514 M139 430L143 510"/>
      <path d="M36 278L31 295 M41 280L38 298 M204 278L209 295 M199 280L202 298"/>`;
  // Front only: collarbones, breastbone + ribs, toe bones (kneecaps are in body-details.js).
  const frontBones = `
      <path d="M120 120Q108 111 91 120 M120 120Q132 111 149 120 M120 119V252"/>
      <path d="${ribs}"/>
      <path d="M90 533L79 552 M95 534L86 553 M99 534L95 553 M102 534L104 553 M150 533L161 552 M145 534L154 553 M141 534L145 553 M138 534L136 553 M78 558l2 5 M86 558l1 6 M94 558l1 6 M102 557l2 6 M108 557l1 6 M162 558l-2 5 M154 558l-1 6 M146 558l-1 6 M138 557l-2 6 M132 557l-1 6"/>`;
  // Back only: the vertebrae along the spine (the spine line is in body-details.js).
  const backBones = `
      <path d="${vertebrae}"/>`;
  const bones = `
    <g class="anatomy-bones">${sharedBones}${view === "front" ? frontBones : backBones}
    </g>`;

  // Arm and leg muscles: the same on both views.
  const limbMuscles = `
      <path d="M65 131C55 135 47 162 49 180C50 189 55 180 60 170C68 153 72 132 65 131Z M175 131C185 135 193 162 191 180C190 189 185 180 180 170C172 153 168 132 175 131Z M47 215C40 219 34 243 36 254C38 263 47 240 51 224Q55 214 47 215Z M193 215C200 219 206 243 204 254C202 263 193 240 189 224Q185 214 193 215Z"/>
      <path d="M85 317C75 322 77 365 85 387C88 399 94 369 94 347C94 329 92 316 85 317Z M105 320C114 332 112 369 106 390C103 402 98 375 99 353C99 335 99 318 105 320Z M155 317C165 322 163 365 155 387C152 399 146 369 146 347C146 329 148 316 155 317Z M135 320C126 332 128 369 134 390C137 402 142 375 141 353C141 335 141 318 135 320Z"/>
      <path d="M86 438C79 442 80 472 86 490C90 507 97 478 96 456C95 444 93 435 86 438Z M154 438C161 442 160 472 154 490C150 507 143 478 144 456C145 444 147 435 154 438Z"/>`;

  const frontMuscles = `
      <path d="M95 190C86 190 87 226 91 239C95 252 105 235 104 219C104 203 102 191 95 190Z M145 190C154 190 153 226 149 239C145 252 135 235 136 219C136 203 138 191 145 190Z"/>`;

  const backMuscles = `
      <path d="M108 101C113 103 114 115 118 126C113 135 99 142 96 146C90 144 88 131 89 125C93 115 103 113 108 101Z M132 101C127 103 126 115 122 126C127 135 141 142 144 146C150 144 152 131 151 125C147 115 137 113 132 101Z"/>
      <path d="M91 149C99 154 108 157 115 156C117 174 115 200 112 213C104 211 96 195 92 177C90 165 87 154 91 149Z M149 149C141 154 132 157 125 156C123 174 125 200 128 213C136 211 144 195 148 177C150 165 153 154 149 149Z"/>
      <path d="M95 213C101 213 111 223 113 228C115 238 111 249 106 247C96 244 90 234 92 222Q92 214 95 213Z M145 213C139 213 129 223 127 228C125 238 129 249 134 247C144 244 150 234 148 222Q148 214 145 213Z M89 267C97 258 110 261 114 271C118 282 107 293 97 293C86 292 82 278 89 267Z M151 267C143 258 130 261 126 271C122 282 133 293 143 293C154 292 158 278 151 267Z"/>
      <path class="anatomy-fibers" d="M93 154L110 168 M94 168L110 182 M96 183L110 195 M147 154L130 168 M146 168L130 182 M144 183L130 195"/>`;

  const muscles = `
    <g class="anatomy-muscles">${limbMuscles}${view === "front" ? frontMuscles : backMuscles}
    </g>`;

  // Front: the patient's right is the viewer's left (liver on screen-left).
  const frontOrgans = `
    <g class="anatomy-organs">
      <path class="anatomy-brain" d="M105 30C109 23 131 23 135 30C139 35 138 40 134 43C126 47 114 47 106 43C102 40 101 35 105 30Z M109 30C113 27 118 28 120 31C122 28 127 27 131 30"/>
      <path class="anatomy-lungs" d="M107 123C99 123 94 134 93 148C92 162 95 172 103 174C111 175 115 169 114 159C113 147 113 133 111 126C110 124 109 123 107 123Z M133 124C141 124 146 135 147 149C148 163 145 172 137 174C129 175 125 169 126 159C127 147 127 133 129 127C130 125 131 124 133 124Z"/>
      <path class="anatomy-airway" d="M120 100V126 M120 126C120 131 116 134 111 137C106 140 101 145 98 151 M120 126C120 131 124 134 129 137C134 140 139 145 142 151"/>
      <path class="anatomy-heart" d="M121 140C126 135 134 137 136 144C138 152 134 163 128 168C124 171 119 168 118 161C116 153 118 144 121 140Z"/>
      <path class="anatomy-diaphragm" d="M92 170C102 156 138 156 148 170"/>
      <path class="anatomy-liver" d="M92 176C104 171 122 174 134 180C139 183 136 190 128 193C114 198 97 196 92 191C88 187 88 179 92 176Z"/>
      <circle class="anatomy-gallbladder" cx="101" cy="193" r="3.2"/>
      <path class="anatomy-stomach" d="M137 184C143 182 148 187 147 195C146 205 138 212 130 212C125 212 124 207 128 203C134 199 136 190 135 186C135 185 136 184 137 184Z"/>
      <path class="anatomy-kidneys" d="M94 196C90 198 89 206 93 210C97 213 101 210 101 204C101 199 98 194 94 196Z M146 196C150 198 151 206 147 210C143 213 139 210 139 204C139 199 142 194 146 196Z"/>
      <path class="anatomy-intestines" d="M100 216C94 220 93 236 97 246C101 253 113 257 121 256C131 255 141 248 143 238C145 228 142 218 136 214C128 209 108 211 100 216Z M106 222C117 217 131 222 130 229C129 236 117 234 111 232C104 230 103 225 106 222Z M108 238C118 234 130 240 126 246C122 251 110 249 108 244Z"/>
      <path class="anatomy-bladder" d="M108 262Q120 255 132 262Q137 275 120 284Q103 275 108 262Z"/>
    </g>`;

  // Back: only the kidneys are shown.
  const backOrgans = `
    <g class="anatomy-organs anatomy-posterior-organs">
      <path class="anatomy-kidneys" d="M106 192Q95 186 96 202Q96 214 105 213Q111 209 107 203Q103 201 106 192Z M134 192Q145 186 144 202Q144 214 135 213Q129 209 133 203Q137 201 134 192Z"/>
    </g>`;

  return `<g class="body-anatomy" aria-hidden="true">${bones}${muscles}${view === "front" ? frontOrgans : backOrgans}</g>`;
}

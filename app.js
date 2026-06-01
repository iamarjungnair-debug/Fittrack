// ═══════════════════════════════════════
//  FITTRACK v3 — app.js
//  Session 1: Backup/Restore + Exercise Import + Meal Import
// ═══════════════════════════════════════

const KEY = 'fittrack_v2'; // never change this
const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

let S = {
  onboarded: false,
  profile: { name:'', height:'', weight:'', goal:'gain' },
  targets: { protein:135, kcal:2450, water:3000, weightGoal:75 },
  gymDays: [1,3,5],
  exercises: [
    { name:'Squats', target:'3 × 8–12', muscles:'Quads, Glutes' },
    { name:'Bench Press', target:'3 × 8–12', muscles:'Chest, Triceps' },
    { name:'Bent-over Rows', target:'3 × 8–12', muscles:'Back, Biceps' },
    { name:'Overhead Press', target:'3 × 8–12', muscles:'Shoulders' },
    { name:'Romanian Deadlift', target:'3 × 8–10', muscles:'Hamstrings' },
    { name:'Plank', target:'3 × 45 sec', muscles:'Core' },
  ],
  supplements: [],
  // mealPlan: { gym: [...], rest: [...] } — replaces DEFAULT_PRESET_MEALS when imported
  mealPlan: null,
  meals: {},
  workouts: {},
  weights: [],
  measurements: { chest:'', waist:'', hips:'', leftArm:'', rightArm:'', leftThigh:'', rightThigh:'', shoulders:'' },
  reminders: { water:false, meal:false, supp:false },
  creatine: {},
};

function load() { try { const d=localStorage.getItem(KEY); if(d) S=JSON.parse(d); } catch(e){} }
function save() { try { localStorage.setItem(KEY,JSON.stringify(S)); } catch(e){} }
function today() { return new Date().toISOString().slice(0,10); }
function getMD(d=today()) { if(!S.meals[d]) S.meals[d]={checklist:{},log:[],water:0,creatine:false,supps:{}}; return S.meals[d]; }
function getWD(d=today()) { if(!S.workouts[d]) S.workouts[d]={exercises:{},notes:''}; return S.workouts[d]; }
function isGymDay(date) { const d=new Date(date+'T12:00:00'); return S.gymDays.includes(d.getDay()); }

// ═══════════════════════════════════════
//  ONBOARDING
// ═══════════════════════════════════════
let obStep = 0;
const OB_STEPS = 6;
let obGoal = 'gain';
let obGymDays = [1,3,5];

function initOb() {
  if(S.onboarded) { document.getElementById('onboarding').classList.add('hidden'); return; }
  buildObProgress();
  showObStep(0);
}

function buildObProgress() {
  const el = document.getElementById('obProgress');
  el.innerHTML = Array.from({length:OB_STEPS-1},(_,i)=>`<div class="ob-dot ${i<obStep?'done':''}" id="obdot${i}"></div>`).join('');
}

function showObStep(n) {
  document.querySelectorAll('.ob-step').forEach(s=>s.classList.remove('active'));
  document.getElementById('ob-'+n).classList.add('active');
  buildObProgress();
}

function obNext() {
  if(obStep===1 && !document.getElementById('obName').value.trim()) { showToast('Enter your name'); return; }
  obStep++;
  if(obStep >= OB_STEPS) return;
  if(obStep === OB_STEPS-1) document.getElementById('obFinalName').textContent = document.getElementById('obName').value.trim() + '!';
  showObStep(obStep);
}

function selectGoal(goal, el) {
  document.querySelectorAll('#ob-3 .ob-option').forEach(o=>o.classList.remove('selected'));
  el.classList.add('selected'); obGoal = goal;
}

function toggleObDay(d, el) {
  el.classList.toggle('selected');
  if(obGymDays.includes(d)) obGymDays=obGymDays.filter(x=>x!==d);
  else obGymDays.push(d);
}

function finishOnboarding() {
  const name = document.getElementById('obName').value.trim() || 'Champion';
  const height = document.getElementById('obHeight').value || '';
  const weight = parseFloat(document.getElementById('obWeight').value) || 0;
  const goal = parseFloat(document.getElementById('obGoal').value) || 75;
  S.onboarded = true;
  S.profile = { name, height, weight, goal: obGoal };
  S.gymDays = obGymDays.length ? obGymDays : [1,3,5];
  S.targets.weightGoal = goal;
  if(weight) S.weights.push({ date:today(), val:weight });
  if(obGoal==='gain') { S.targets.protein=130; S.targets.kcal=2450; }
  else if(obGoal==='lose') { S.targets.protein=150; S.targets.kcal=1800; }
  else if(obGoal==='maintain') { S.targets.protein=120; S.targets.kcal=2100; }
  else { S.targets.protein=140; S.targets.kcal=2300; }
  save();
  document.getElementById('onboarding').classList.add('hidden');
  initApp();
}

// ═══════════════════════════════════════
//  APP INIT
// ═══════════════════════════════════════
function initApp() {
  initTopbar();
  renderDash();
  loadSettingsForm();
  renderProfileDisplay();
  renderGymDaysCard();
  renderExLibrary();
  renderMeasGrid();
  checkNotifPermission();
  scheduleReminders();
}

function initTopbar() {
  const now = new Date();
  document.getElementById('topDate').textContent = DAYS[now.getDay()].toUpperCase() + ' ' + now.getDate() + ' ' + MONTHS[now.getMonth()].toUpperCase();
  updateStreak();
}

// ═══════════════════════════════════════
//  NAVIGATION
// ═══════════════════════════════════════
function nav(id, btn) {
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b=>b.classList.remove('active'));
  document.getElementById('page-'+id).classList.add('active');
  btn.classList.add('active');
  document.getElementById('scrollArea').scrollTop=0;
  if(id==='dash') renderDash();
  if(id==='meals') renderMealsPage();
  if(id==='workout') renderWorkout();
  if(id==='progress') renderProgress();
  if(id==='planner') { renderWeeklyPlanner(); generateShoppingList(); }
  if(id==='settings') { loadSettingsForm(); renderProfileDisplay(); renderGymDaysCard(); renderExLibrary(); }
}

// ═══════════════════════════════════════
//  DASHBOARD
// ═══════════════════════════════════════
function renderDash() {
  const now = new Date();
  const dayName = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][now.getDay()];
  const gymToday = S.gymDays.includes(now.getDay());
  const name = S.profile.name || 'Champion';
  const h = now.getHours();
  document.getElementById('dashGreet').textContent = (h<12?'Good morning, ':h<17?'Good afternoon, ':'Good evening, ') + name;
  document.getElementById('dashDay').innerHTML = dayName + ' &mdash; <span class="'+(gymToday?'gym':'rest')+'">'+(gymToday?'Gym Day 💪':'Rest Day 🛌')+'</span>';

  const md = getMD();
  let tp=0, tk=0;
  const meals = getPresetMeals();
  meals.forEach(m=>{ if(md.checklist[m.id]){tp+=m.protein;tk+=m.kcal;} });
  md.log.forEach(e=>{ tp+=(e.p||0); tk+=(e.k||0); });

  const pp=S.targets.protein, pk=S.targets.kcal, pw=S.targets.water;
  document.getElementById('dbProteinVal').textContent = tp+'g / '+pp+'g';
  document.getElementById('dbKcalVal').textContent = tk+' / '+pk+' kcal';
  document.getElementById('dbWaterVal').textContent = (md.water||0)+' / '+pw+'ml';
  document.getElementById('dbProteinBar').style.width = Math.min(100,tp/pp*100)+'%';
  document.getElementById('dbKcalBar').style.width = Math.min(100,tk/pk*100)+'%';
  document.getElementById('dbWaterBar').style.width = Math.min(100,(md.water||0)/pw*100)+'%';

  const lastW = S.weights.length ? S.weights[S.weights.length-1].val : '--';
  document.getElementById('dbWeight').textContent = lastW;
  const checked = meals.filter(m=>md.checklist[m.id]).length;
  document.getElementById('dbMeals').textContent = checked+'/'+meals.length;
  document.getElementById('dbToday').textContent = gymToday ? 'GYM' : 'REST';
  document.getElementById('pGoal').textContent = S.targets.weightGoal;
  drawChart('dashChart', S.weights.slice(-10), '#ff7b2c', 100);
}

// ═══════════════════════════════════════
//  STREAK
// ═══════════════════════════════════════
function updateStreak() {
  let streak = 0;
  const today_d = new Date(); today_d.setHours(0,0,0,0);
  for(let i=0; i<365; i++) {
    const d = new Date(today_d); d.setDate(today_d.getDate()-i);
    const key = d.toISOString().slice(0,10);
    const wd = S.workouts[key];
    const hasSets = wd && Object.values(wd.exercises||{}).some(sets=>sets.some(s=>s.done));
    if(hasSets) streak++;
    else if(i>0) break;
  }
  document.getElementById('streakCount').textContent = streak;
}

// ═══════════════════════════════════════
//  MEAL PLAN — GYM vs REST
// ═══════════════════════════════════════
const DEFAULT_GYM_MEALS = [
  { id:'m1', name:'Pre-Gym Fuel', time:'7:30 AM', protein:12, kcal:250, items:[
    {name:'10 soaked almonds',note:'Vit E for skin',p:3,ingredient:'Almonds',qty:'10 pieces',category:'Nuts & Seeds'},
    {name:'1 banana',note:'Fast carbs',p:1,ingredient:'Banana',qty:'1',category:'Fruits'},
    {name:'1 glass full-fat milk',note:'Protein',p:8,ingredient:'Full-fat milk',qty:'250ml',category:'Dairy'}]},
  { id:'m2', name:'Post-Workout Breakfast', time:'9:15 AM', protein:55, kcal:650, items:[
    {name:'1 scoop Whey + milk',note:'Within 45 min',p:30,ingredient:'Whey protein',qty:'1 scoop (30g)',category:'Supplements'},
    {name:'3 whole eggs',note:'Core protein',p:18,ingredient:'Eggs',qty:'3',category:'Protein'},
    {name:'1.5 cups rice / 2 chapati',note:'Glycogen',p:5,ingredient:'Rice or Wheat flour',qty:'1.5 cups / 60g flour',category:'Grains'},
    {name:'1 cup dal + veg',note:'Drumstick preferred',p:9,ingredient:'Toor dal',qty:'½ cup dry',category:'Protein'},
    {name:'1 cup full-fat curd',note:'Probiotics',p:5,ingredient:'Full-fat curd',qty:'200g',category:'Dairy'}]},
  { id:'m3', name:'Lunch', time:'12:30 PM', protein:45, kcal:650, items:[
    {name:'150g chicken',note:'Kerala curry style',p:35,ingredient:'Chicken',qty:'150g',category:'Protein'},
    {name:'1.5 cups rice',note:'',p:5,ingredient:'Rice',qty:'1.5 cups cooked',category:'Grains'},
    {name:'1 cup vegetables',note:'Drumstick preferred',p:3,ingredient:'Drumstick / mixed veg',qty:'1 cup',category:'Vegetables'},
    {name:'1 cup curd',note:'Probiotics',p:5,ingredient:'Full-fat curd',qty:'200g',category:'Dairy'}]},
  { id:'m4', name:'Afternoon Snack', time:'4:00 PM', protein:15, kcal:300, items:[
    {name:'2 tbsp peanut butter + banana',note:'',p:10,ingredient:'Peanut butter',qty:'2 tbsp',category:'Nuts & Seeds'},
    {name:'1 glass milk / curd',note:'',p:8,ingredient:'Full-fat milk',qty:'250ml',category:'Dairy'}]},
  { id:'m5', name:'Dinner', time:'7:00 PM', protein:30, kcal:500, items:[
    {name:'100g paneer OR 2 eggs + dal',note:'Slow protein',p:20,ingredient:'Paneer or Eggs',qty:'100g / 2 eggs',category:'Protein'},
    {name:'1 cup rice / 2 chapati',note:'',p:5,ingredient:'Rice or Wheat flour',qty:'1 cup / 40g flour',category:'Grains'},
    {name:'Vegetables or sambar',note:'',p:3,ingredient:'Mixed vegetables',qty:'1 cup',category:'Vegetables'}]},
  { id:'m6', name:'Bedtime Milk', time:'9:30 PM', protein:8, kcal:150, items:[
    {name:'250ml warm milk + turmeric',note:'Anti-inflammatory',p:8,ingredient:'Full-fat milk',qty:'250ml',category:'Dairy'},
    {name:'Pinch of turmeric',note:'',p:0,ingredient:'Turmeric',qty:'¼ tsp',category:'Spices'}]},
];

const DEFAULT_REST_MEALS = [
  { id:'r1', name:'Morning Fuel', time:'8:00 AM', protein:10, kcal:220, items:[
    {name:'10 soaked almonds',note:'Vit E for skin',p:3,ingredient:'Almonds',qty:'10 pieces',category:'Nuts & Seeds'},
    {name:'1 banana',note:'',p:1,ingredient:'Banana',qty:'1',category:'Fruits'},
    {name:'1 glass full-fat milk',note:'',p:8,ingredient:'Full-fat milk',qty:'250ml',category:'Dairy'}]},
  { id:'r2', name:'Mid-Morning Meal', time:'10:00 AM', protein:32, kcal:420, items:[
    {name:'3 whole eggs',note:'Core protein',p:18,ingredient:'Eggs',qty:'3',category:'Protein'},
    {name:'1 cup rice / 2 chapati',note:'Lighter than gym day',p:4,ingredient:'Rice or Wheat flour',qty:'1 cup / 40g flour',category:'Grains'},
    {name:'1 cup dal',note:'',p:9,ingredient:'Toor dal',qty:'½ cup dry',category:'Protein'},
    {name:'1 cup curd',note:'Probiotics',p:5,ingredient:'Full-fat curd',qty:'200g',category:'Dairy'}]},
  { id:'r3', name:'Lunch', time:'12:30 PM', protein:45, kcal:650, items:[
    {name:'150g chicken',note:'Kerala curry style',p:35,ingredient:'Chicken',qty:'150g',category:'Protein'},
    {name:'1.5 cups rice',note:'',p:5,ingredient:'Rice',qty:'1.5 cups cooked',category:'Grains'},
    {name:'1 cup vegetables',note:'',p:3,ingredient:'Mixed vegetables',qty:'1 cup',category:'Vegetables'},
    {name:'1 cup curd',note:'',p:5,ingredient:'Full-fat curd',qty:'200g',category:'Dairy'}]},
  { id:'r4', name:'Afternoon Snack', time:'4:00 PM', protein:15, kcal:300, items:[
    {name:'2 tbsp peanut butter + banana',note:'',p:10,ingredient:'Peanut butter',qty:'2 tbsp',category:'Nuts & Seeds'},
    {name:'1 glass milk / curd',note:'',p:8,ingredient:'Full-fat milk',qty:'250ml',category:'Dairy'}]},
  { id:'r5', name:'Dinner', time:'7:00 PM', protein:30, kcal:500, items:[
    {name:'100g paneer OR 2 eggs + dal',note:'Slow protein',p:20,ingredient:'Paneer or Eggs',qty:'100g / 2 eggs',category:'Protein'},
    {name:'1 cup rice / 2 chapati',note:'',p:5,ingredient:'Rice or Wheat flour',qty:'1 cup / 40g flour',category:'Grains'},
    {name:'Vegetables or sambar',note:'',p:3,ingredient:'Mixed vegetables',qty:'1 cup',category:'Vegetables'}]},
  { id:'r6', name:'Bedtime Milk', time:'9:30 PM', protein:8, kcal:150, items:[
    {name:'250ml warm milk + turmeric',note:'Anti-inflammatory',p:8,ingredient:'Full-fat milk',qty:'250ml',category:'Dairy'},
    {name:'Pinch of turmeric',note:'',p:0,ingredient:'Turmeric',qty:'¼ tsp',category:'Spices'}]},
];

function getPresetMeals(forDate) {
  const date = forDate || today();
  const gym = S.gymDays.includes(new Date(date+'T12:00:00').getDay());
  if(S.mealPlan) {
    return gym ? (S.mealPlan.gym || DEFAULT_GYM_MEALS) : (S.mealPlan.rest || DEFAULT_REST_MEALS);
  }
  return gym ? DEFAULT_GYM_MEALS : DEFAULT_REST_MEALS;
}

// ═══════════════════════════════════════
//  MEALS PAGE
// ═══════════════════════════════════════
function renderMealsPage() {
  renderWater();
  renderCreatine();
  renderSupps();
  renderPresetMeals();
  renderFoodLog();
}

function renderWater() {
  const md = getMD();
  const w = md.water||0;
  const goal = S.targets.water;
  document.getElementById('waterVal').textContent = w+' / '+goal+'ml';
  document.getElementById('waterFill').style.width = Math.min(100,w/goal*100)+'%';
}

function addWater(ml) {
  const md = getMD();
  md.water = Math.max(0,(md.water||0)+ml);
  save(); renderWater(); renderDash();
  showToast(ml>0?'💧 +'+ml+'ml logged':'Adjusted');
}

function renderCreatine() {
  const md = getMD();
  const done = md.creatine||false;
  const el = document.getElementById('creatineCheck');
  el.className = 'supp-check'+(done?' done':'');
  el.textContent = done?'✓':'';
}

function toggleCreatine() {
  const md = getMD();
  md.creatine = !md.creatine;
  save(); renderCreatine(); renderDash();
  showToast(md.creatine?'✓ Creatine logged!':'Creatine unchecked');
}

function renderSupps() {
  const md = getMD();
  const list = document.getElementById('suppList');
  if(!S.supplements.length) { list.innerHTML='<div class="empty" style="padding:16px"><div class="empty-icon">💊</div>Add supplements below</div>'; return; }
  list.innerHTML = S.supplements.map((s,i)=>`
    <div class="supp-item">
      <div class="supp-check ${md.supps&&md.supps[i]?' done':''}" onclick="toggleSupp(${i})">${md.supps&&md.supps[i]?'✓':''}</div>
      <div class="supp-info">
        <div class="supp-name">${s.name}</div>
        <div class="supp-detail">${s.dose}</div>
        <div class="supp-time">${s.time||''}</div>
      </div>
      <button class="supp-del" onclick="deleteSupp(${i})">✕</button>
    </div>`).join('');
}

function toggleSupp(i) {
  const md = getMD();
  if(!md.supps) md.supps={};
  md.supps[i] = !md.supps[i];
  save(); renderSupps();
  showToast(md.supps[i]?'✓ '+S.supplements[i].name+' logged':'Unchecked');
}

function deleteSupp(i) { S.supplements.splice(i,1); save(); renderSupps(); }

function openAddSupp() { document.getElementById('modalAddSupp').classList.add('open'); }

function saveSupp() {
  const name = document.getElementById('suppName').value.trim();
  if(!name) { showToast('Enter supplement name'); return; }
  S.supplements.push({ name, dose:document.getElementById('suppDose').value.trim(), time:document.getElementById('suppTime').value.trim() });
  save();
  document.getElementById('suppName').value='';
  document.getElementById('suppDose').value='';
  document.getElementById('suppTime').value='';
  closeModal('modalAddSupp');
  renderSupps();
  showToast('Supplement added!');
}

function renderPresetMeals(forDate) {
  const date = forDate || today();
  const md = getMD(date);
  const container = document.getElementById('mealPresetsContainer');
  if(!container) return;
  container.innerHTML = '';
  getPresetMeals(date).forEach(meal=>{
    const checked = !!md.checklist[meal.id];
    const div = document.createElement('div');
    div.className = 'meal-card-item';
    div.innerHTML = `
      <div class="meal-hdr" onclick="toggleMealBody('${meal.id}')">
        <div class="meal-left">
          <div class="meal-check ${checked?'done':''}" id="mchk-${meal.id}">${checked?'✓':''}</div>
          <div><div class="meal-name">${meal.name}</div><div class="meal-time-lbl">${meal.time}</div></div>
        </div>
        <div class="mpills"><span class="mpill mpill-p">${meal.protein}g P</span><span class="mpill mpill-k">${meal.kcal}kcal</span></div>
      </div>
      <div class="meal-body" id="mbody-${meal.id}">
        ${meal.items.map(it=>`<div class="meal-food-row"><div><div>${it.name}</div><div style="font-size:11px;color:var(--muted)">${it.note||''}</div></div><div style="font-family:'DM Mono',monospace;font-size:11px;color:var(--blue)">${it.p}g</div></div>`).join('')}
        <div style="margin-top:10px"><button class="btn btn-sm" style="width:100%" onclick="checkMeal('${meal.id}','${date}');event.stopPropagation()">${checked?'✓ Logged':'Mark as Eaten'}</button></div>
      </div>`;
    container.appendChild(div);
  });
}

function toggleMealBody(id) { document.getElementById('mbody-'+id).classList.toggle('open'); }

function checkMeal(id, date) {
  const d = date || today();
  const md = getMD(d);
  md.checklist[id] = !md.checklist[id];
  save(); renderPresetMeals(d); renderDash();
  showToast(md.checklist[id]?'✓ Meal logged!':'Unchecked');
}

function renderFoodLog() {
  const md = getMD();
  const list = document.getElementById('foodLogList');
  if(!md.log.length) { list.innerHTML='<div class="empty"><div class="empty-icon">➕</div>Add food below</div>'; return; }
  list.innerHTML = md.log.map((e,i)=>`
    <div class="food-log-entry">
      <div class="food-log-name">${e.name}</div>
      <div class="food-log-macros"><span style="color:var(--blue)">${e.p}g P</span>&nbsp;<span style="color:var(--accent)">${e.k} kcal</span></div>
      <button class="food-log-del" onclick="deleteFood(${i})">✕</button>
    </div>`).join('');
}

function addFood() {
  const name = document.getElementById('addFoodName').value.trim();
  if(!name) { showToast('Enter food name'); return; }
  const md = getMD();
  md.log.push({ name, p:parseInt(document.getElementById('addFoodP').value)||0, k:parseInt(document.getElementById('addFoodK').value)||0 });
  save();
  document.getElementById('addFoodName').value='';
  document.getElementById('addFoodP').value='';
  document.getElementById('addFoodK').value='';
  renderFoodLog(); renderDash(); showToast('Food added!');
}

function deleteFood(i) { const md=getMD(); md.log.splice(i,1); save(); renderFoodLog(); renderDash(); }

function resetMeals() {
  if(!confirm('Reset today\'s log?')) return;
  S.meals[today()] = {checklist:{},log:[],water:0,creatine:false,supps:{}};
  save(); renderMealsPage(); renderDash(); showToast('Reset');
}

// ═══════════════════════════════════════
//  MEAL IMPORT — PASTE FORMAT
// ═══════════════════════════════════════
/*
  FORMAT (copy-paste from Claude chat):
  ──────────────────────────────────────
  TYPE::gym
  MEAL::Pre-Gym Fuel::7:30 AM::protein=12::kcal=250
  ITEM::10 soaked almonds::note=Vit E for skin::p=3::ingredient=Almonds::qty=10 pieces::category=Nuts & Seeds
  ITEM::1 banana::note=Fast carbs::p=1::ingredient=Banana::qty=1::category=Fruits
  MEAL::Lunch::12:30 PM::protein=45::kcal=650
  ITEM::150g chicken::note=Kerala curry::p=35::ingredient=Chicken::qty=150g::category=Protein
  ...

  TYPE can be: gym | rest | both
  If TYPE::both — parser looks for GYM_START / REST_START markers
  ──────────────────────────────────────
*/

function openMealImport() {
  document.getElementById('mealImportText').value = '';
  document.getElementById('mealImportPreview').innerHTML = '';
  document.getElementById('modalMealImport').classList.add('open');
}

function parseMealImport(raw) {
  const lines = raw.trim().split('\n').map(l=>l.trim()).filter(l=>l);
  const result = { gym:[], rest:[] };
  let currentType = 'gym';
  let currentMeal = null;
  let mealIdCounter = 0;

  for(const line of lines) {
    if(line.startsWith('TYPE::')) {
      currentType = line.split('::')[1].toLowerCase().trim();
      continue;
    }
    if(line === 'GYM_START') { currentType='gym'; continue; }
    if(line === 'REST_START') { currentType='rest'; continue; }

    if(line.startsWith('MEAL::')) {
      if(currentMeal) {
        if(currentType==='both') { result.gym.push({...currentMeal,id:'g'+mealIdCounter}); result.rest.push({...currentMeal,id:'r'+mealIdCounter}); }
        else result[currentType==='rest'?'rest':'gym'].push({...currentMeal});
        mealIdCounter++;
      }
      const parts = line.split('::');
      currentMeal = { id:'m'+(++mealIdCounter), name:parts[1]||'Meal', time:parts[2]||'', protein:0, kcal:0, items:[] };
      parts.slice(3).forEach(p=>{
        if(p.startsWith('protein=')) currentMeal.protein=parseInt(p.split('=')[1])||0;
        if(p.startsWith('kcal=')) currentMeal.kcal=parseInt(p.split('=')[1])||0;
      });
      continue;
    }

    if(line.startsWith('ITEM::') && currentMeal) {
      const parts = line.split('::');
      const item = { name:parts[1]||'', note:'', p:0, ingredient:'', qty:'', category:'General' };
      parts.slice(2).forEach(p=>{
        const [k,v] = p.split('=');
        if(k==='note') item.note=v||'';
        if(k==='p') item.p=parseInt(v)||0;
        if(k==='ingredient') item.ingredient=v||'';
        if(k==='qty') item.qty=v||'';
        if(k==='category') item.category=v||'General';
      });
      currentMeal.items.push(item);
      continue;
    }
  }

  // Push last meal
  if(currentMeal) {
    if(currentType==='both') { result.gym.push({...currentMeal,id:'g'+mealIdCounter}); result.rest.push({...currentMeal,id:'r'+mealIdCounter}); }
    else result[currentType==='rest'?'rest':'gym'].push({...currentMeal});
  }

  return result;
}

function previewMealImport() {
  const raw = document.getElementById('mealImportText').value;
  if(!raw.trim()) { showToast('Paste your meal plan first'); return; }
  try {
    const parsed = parseMealImport(raw);
    const preview = document.getElementById('mealImportPreview');
    let html = '';
    if(parsed.gym.length) {
      html += `<div style="font-family:'DM Mono',monospace;font-size:10px;color:var(--accent);letter-spacing:2px;margin-bottom:8px;margin-top:12px">GYM DAYS (${parsed.gym.length} meals)</div>`;
      parsed.gym.forEach(m=>{ html+=`<div style="font-size:13px;padding:6px 0;border-bottom:1px solid var(--border)"><strong>${m.name}</strong> <span style="color:var(--muted)">${m.time}</span> — ${m.protein}g P · ${m.kcal}kcal · ${m.items.length} items</div>`; });
    }
    if(parsed.rest.length) {
      html += `<div style="font-family:'DM Mono',monospace;font-size:10px;color:var(--orange);letter-spacing:2px;margin-bottom:8px;margin-top:12px">REST DAYS (${parsed.rest.length} meals)</div>`;
      parsed.rest.forEach(m=>{ html+=`<div style="font-size:13px;padding:6px 0;border-bottom:1px solid var(--border)"><strong>${m.name}</strong> <span style="color:var(--muted)">${m.time}</span> — ${m.protein}g P · ${m.kcal}kcal · ${m.items.length} items</div>`; });
    }
    if(!parsed.gym.length && !parsed.rest.length) { preview.innerHTML='<div style="color:var(--red);font-size:13px">Could not parse. Check format.</div>'; return; }
    preview.innerHTML = html;
    preview.dataset.parsed = JSON.stringify(parsed);
    showToast('Preview ready — check and confirm');
  } catch(e) { document.getElementById('mealImportPreview').innerHTML='<div style="color:var(--red);font-size:13px">Parse error: '+e.message+'</div>'; }
}

function confirmMealImport() {
  const preview = document.getElementById('mealImportPreview');
  if(!preview.dataset.parsed) { showToast('Preview first'); return; }
  try {
    const parsed = JSON.parse(preview.dataset.parsed);
    if(!S.mealPlan) S.mealPlan = {};
    if(parsed.gym.length) S.mealPlan.gym = parsed.gym;
    if(parsed.rest.length) S.mealPlan.rest = parsed.rest;
    save();
    closeModal('modalMealImport');
    renderMealsPage();
    showToast('✓ Meal plan imported!');
  } catch(e) { showToast('Import failed'); }
}

function resetMealPlan() {
  if(!confirm('Reset to default meal plan?')) return;
  S.mealPlan = null;
  save(); renderMealsPage(); showToast('Meal plan reset to default');
}

// ═══════════════════════════════════════
//  EXERCISE IMPORT — PASTE FORMAT
// ═══════════════════════════════════════
/*
  FORMAT:
  ──────────────────────────────────────
  EXERCISE::Squats::3 × 8–12::Quads, Glutes
  EXERCISE::Bench Press::3 × 8–12::Chest, Triceps
  EXERCISE::Pull-ups::3 × 8–10::Back, Biceps
  ──────────────────────────────────────
  One exercise per line. Tab or copy from Claude chat.
*/

function openExImport() {
  document.getElementById('exImportText').value = '';
  document.getElementById('exImportPreview').innerHTML = '';
  document.getElementById('modalExImport').classList.add('open');
}

function parseExercises(raw) {
  return raw.trim().split('\n')
    .map(l=>l.trim())
    .filter(l=>l.startsWith('EXERCISE::'))
    .map(l=>{
      const parts = l.split('::');
      return { name:parts[1]||'', target:parts[2]||'3 × 10', muscles:parts[3]||'' };
    })
    .filter(e=>e.name);
}

function previewExImport() {
  const raw = document.getElementById('exImportText').value;
  if(!raw.trim()) { showToast('Paste exercises first'); return; }
  const parsed = parseExercises(raw);
  const preview = document.getElementById('exImportPreview');
  if(!parsed.length) { preview.innerHTML='<div style="color:var(--red);font-size:13px">No valid exercises found. Check format.</div>'; return; }
  preview.innerHTML = parsed.map(e=>`<div style="font-size:13px;padding:6px 0;border-bottom:1px solid var(--border)"><strong>${e.name}</strong> <span style="color:var(--muted)">${e.target}</span> · <span style="color:var(--blue)">${e.muscles}</span></div>`).join('');
  preview.dataset.parsed = JSON.stringify(parsed);
  showToast(parsed.length+' exercises found — confirm to import');
}

function confirmExImport() {
  const preview = document.getElementById('exImportPreview');
  if(!preview.dataset.parsed) { showToast('Preview first'); return; }
  const modeEl = document.getElementById('exImportMode');
  const mode = modeEl ? modeEl.value : 'replace';
  const parsed = JSON.parse(preview.dataset.parsed);
  if(mode === 'replace') S.exercises = parsed;
  else S.exercises = [...S.exercises, ...parsed];
  save();
  closeModal('modalExImport');
  renderExLibrary();
  renderWorkout();
  showToast('✓ '+parsed.length+' exercises imported!');
}

// ═══════════════════════════════════════
//  WORKOUT
// ═══════════════════════════════════════
let activeWDate = today();
let restInterval = null;
let restSeconds = 0;

function renderWorkout() {
  renderDayTabs();
  renderWorkoutContent();
}

function renderDayTabs() {
  const container = document.getElementById('dayTabs');
  container.innerHTML='';
  const now = new Date();
  for(let i=-2;i<=6;i++) {
    const d = new Date(now); d.setDate(now.getDate()+i);
    const key = d.toISOString().slice(0,10);
    const dow = d.getDay();
    const gym = S.gymDays.includes(dow);
    const label = i===0?'Today':i===1?'Tmrw':DAYS[dow]+' '+d.getDate();
    const btn = document.createElement('button');
    btn.className='day-tab'+(key===activeWDate?' active':'')+(!gym?' rest':'');
    btn.textContent = label+(gym?' 💪':'');
    btn.onclick=()=>{ activeWDate=key; renderDayTabs(); renderWorkoutContent(); };
    container.appendChild(btn);
  }
}

function renderWorkoutContent() {
  const container = document.getElementById('workoutContent');
  const d = new Date(activeWDate+'T12:00:00');
  const gym = S.gymDays.includes(d.getDay());
  const wd = getWD(activeWDate);

  if(!gym) {
    container.innerHTML=`<div style="padding:0 16px"><div class="card card-pad" style="text-align:center;padding:30px 20px">
      <div style="font-size:36px;margin-bottom:10px">🛌</div>
      <div style="font-family:'Syne',sans-serif;font-size:22px;font-weight:700;color:var(--orange);margin-bottom:6px">REST DAY</div>
      <div style="font-size:13px;color:var(--muted);line-height:1.7">Muscles grow during recovery.<br>Walk, stretch, hydrate. Eat your protein.</div>
    </div></div>`;
    return;
  }

  const allDone = S.exercises.length>0 && S.exercises.every(ex=>{
    const sets=wd.exercises[ex.name]||[];
    return sets.length>0 && sets.every(s=>s.done);
  });

  let html=`<div class="complete-banner ${allDone?'show':''}"><div class="complete-title">🎉 Workout Complete!</div><div class="complete-sub">All sets done. Rest well.</div></div>`;

  S.exercises.forEach(ex=>{
    const sets=wd.exercises[ex.name]||[];
    const prevDate=getPrevGymDate();
    const prevSets=prevDate?(getWD(prevDate).exercises[ex.name]||[]):[];
    const bestPrev=prevSets.length?Math.max(...prevSets.filter(s=>s.done&&s.weight).map(s=>parseFloat(s.weight)||0)):0;
    const bestCurr=sets.length?Math.max(...sets.filter(s=>s.done&&s.weight).map(s=>parseFloat(s.weight)||0)):0;
    const isPR=bestCurr>0&&bestPrev>0&&bestCurr>bestPrev;
    const safeId=ex.name.replace(/[^a-z0-9]/gi,'_');

    html+=`<div class="ex-card">
      <div class="ex-hdr" onclick="toggleExBody('${safeId}')">
        <div><div class="ex-name">${ex.name}</div><div class="ex-sub">${ex.target} · ${ex.muscles}</div></div>
        <div style="display:flex;align-items:center;gap:6px">${isPR?'<span class="pr-badge">🏆 PR</span>':''}<span style="color:var(--muted);font-size:16px">▾</span></div>
      </div>
      <div class="sets-body" id="sb-${safeId}">
        ${bestPrev?`<div class="overload-tip show">📈 Last best: <strong>${bestPrev}kg</strong> — beat it!</div>`:''}
        <div class="sets-hdr"><span>SET</span><span>REPS</span><span>WT</span><span>PREV</span><span>✓</span></div>
        <div id="sr-${safeId}">
          ${sets.length?sets.map((s,i)=>buildSetRow(ex.name,i,s,prevSets[i],safeId)).join(''):buildSetRow(ex.name,0,{reps:'',weight:'',done:false},prevSets[0],safeId)}
        </div>
        <button class="add-set-btn" onclick="addSet('${ex.name}','${safeId}')">+ Add Set</button>
      </div>
    </div>`;
  });

  html+=`<div class="card" style="margin:0 16px 10px">
    <div style="padding:12px 14px;border-bottom:1px solid var(--border)">
      <div style="font-size:13px;font-weight:600;color:var(--text2)">Workout Notes</div>
    </div>
    <div class="workout-notes">
      <textarea class="notes-inp" placeholder="How did it feel? Energy level, soreness, PR attempts..." onchange="saveNotes(this.value)">${wd.notes||''}</textarea>
    </div>
  </div>`;

  container.innerHTML=html;
}

function buildSetRow(exName,i,set,prev,safeId) {
  const prevStr=prev?(prev.reps||'-')+'r '+(prev.weight||'-')+'kg':'--';
  return `<div class="set-row" id="setrow-${safeId}-${i}">
    <div class="set-num">${i+1}</div>
    <input class="set-inp" type="number" min="1" max="100" placeholder="0" value="${set.reps||''}" onchange="updateSet('${exName}',${i},'reps',this.value)">
    <input class="set-inp" type="number" min="0" max="500" step="0.5" placeholder="kg" value="${set.weight||''}" onchange="updateSet('${exName}',${i},'weight',this.value)">
    <div class="set-inp prev">${prevStr}</div>
    <button class="set-done ${set.done?'done':''}" onclick="toggleSetDone('${exName}',${i},this,'${safeId}')">${set.done?'✓':''}</button>
  </div>`;
}

function toggleExBody(safeId) { document.getElementById('sb-'+safeId).classList.toggle('open'); }

function updateSet(exName,idx,field,val) {
  const wd=getWD(activeWDate);
  if(!wd.exercises[exName]) wd.exercises[exName]=[];
  while(wd.exercises[exName].length<=idx) wd.exercises[exName].push({reps:'',weight:'',done:false});
  wd.exercises[exName][idx][field]=val;
  save();
}

function toggleSetDone(exName,idx,btn,safeId) {
  const wd=getWD(activeWDate);
  if(!wd.exercises[exName]) wd.exercises[exName]=[];
  while(wd.exercises[exName].length<=idx) wd.exercises[exName].push({reps:'',weight:'',done:false});
  wd.exercises[exName][idx].done=!wd.exercises[exName][idx].done;
  btn.classList.toggle('done');
  btn.textContent=wd.exercises[exName][idx].done?'✓':'';
  save();
  if(wd.exercises[exName][idx].done) startRestTimer(60);
  const allDone=S.exercises.every(ex=>{ const s=wd.exercises[ex.name]||[]; return s.length>0&&s.every(x=>x.done); });
  const banner=document.querySelector('.complete-banner');
  if(banner) banner.classList.toggle('show',allDone);
  if(allDone) showToast('💪 Workout complete!');
  updateStreak();
}

function addSet(exName,safeId) {
  const wd=getWD(activeWDate);
  if(!wd.exercises[exName]) wd.exercises[exName]=[];
  const prevDate=getPrevGymDate();
  const prevSets=prevDate?(getWD(prevDate).exercises[exName]||[]):[];
  const idx=wd.exercises[exName].length;
  wd.exercises[exName].push({reps:'',weight:'',done:false});
  save();
  const container=document.getElementById('sr-'+safeId);
  if(container) { const t=document.createElement('div'); t.innerHTML=buildSetRow(exName,idx,{reps:'',weight:'',done:false},prevSets[idx],safeId); container.appendChild(t.firstElementChild); }
}

function saveNotes(val) { const wd=getWD(activeWDate); wd.notes=val; save(); }

function getPrevGymDate() {
  const dates=Object.keys(S.workouts).sort();
  const idx=dates.indexOf(activeWDate);
  for(let i=idx-1;i>=0;i--) { const d=new Date(dates[i]+'T12:00:00'); if(S.gymDays.includes(d.getDay())) return dates[i]; }
  return null;
}

// ═══════════════════════════════════════
//  REST TIMER
// ═══════════════════════════════════════
function startRestTimer(secs) {
  restSeconds=secs;
  document.getElementById('restTimer').classList.add('show');
  document.getElementById('restCount').textContent=restSeconds;
  clearInterval(restInterval);
  restInterval=setInterval(()=>{
    restSeconds--;
    document.getElementById('restCount').textContent=restSeconds;
    if(restSeconds<=0) { stopRestTimer(); showToast('⏱ Rest over — next set!'); }
    if(restSeconds<=5) document.getElementById('restCount').style.color='var(--red)';
    else document.getElementById('restCount').style.color='var(--accent)';
  },1000);
}

function setRestTimer(s) { startRestTimer(s); }
function stopRestTimer() { clearInterval(restInterval); document.getElementById('restTimer').classList.remove('show'); }

// ═══════════════════════════════════════
//  PROGRESS
// ═══════════════════════════════════════
function renderProgress() {
  const weights=S.weights;
  if(weights.length) {
    const curr=weights[weights.length-1].val;
    const first=weights[0].val;
    const diff=(curr-first).toFixed(1);
    document.getElementById('pCurr').textContent=curr;
    document.getElementById('pChange').textContent=(diff>=0?'+':'')+diff+'kg';
  }
  let wCount=0;
  Object.values(S.workouts).forEach(w=>{ if(Object.values(w.exercises||{}).some(sets=>sets.some(s=>s.done))) wCount++; });
  document.getElementById('pWorkouts').textContent=wCount;
  document.getElementById('pGoal').textContent=S.targets.weightGoal;
  drawChart('weightChart',S.weights.slice(-16),'#ff7b2c',120);
  renderStrengthProgress();
}

function logWeight() {
  const val=parseFloat(document.getElementById('weightInp').value);
  if(!val||val<20||val>300) { showToast('Enter valid weight'); return; }
  const t=today();
  const idx=S.weights.findIndex(w=>w.date===t);
  if(idx>=0) S.weights[idx].val=val; else S.weights.push({date:t,val});
  save();
  document.getElementById('weightInp').value='';
  renderProgress(); renderDash(); showToast('Weight logged: '+val+'kg');
}

function renderStrengthProgress() {
  const sc=document.getElementById('strengthCard');
  const bests={};
  Object.entries(S.workouts).sort().forEach(([date,wd])=>{
    Object.entries(wd.exercises||{}).forEach(([name,sets])=>{
      const done=sets.filter(s=>s.done&&s.weight);
      if(done.length) { const b=Math.max(...done.map(s=>parseFloat(s.weight)||0)); if(!bests[name])bests[name]=[]; bests[name].push({date,best:b}); }
    });
  });
  if(!Object.keys(bests).length) { sc.innerHTML='<div class="empty"><div class="empty-icon">💪</div>Log workouts to track strength</div>'; return; }
  sc.innerHTML=Object.entries(bests).map(([name,entries])=>{
    const curr=entries[entries.length-1].best;
    const prev=entries.length>1?entries[entries.length-2].best:null;
    const delta=prev?(curr-prev).toFixed(1):null;
    return `<div class="strength-row"><div>${name}</div><div style="text-align:right"><div class="strength-best">${curr}kg</div>${delta?`<div class="strength-delta ${delta>=0?'up':''}">${delta>=0?'+':''}${delta}kg</div>`:''}</div></div>`;
  }).join('');
}

// MEASUREMENTS
const MEAS_FIELDS = [
  {key:'chest',label:'Chest (cm)'},{key:'waist',label:'Waist (cm)'},{key:'hips',label:'Hips (cm)'},
  {key:'leftArm',label:'Left Arm (cm)'},{key:'rightArm',label:'Right Arm (cm)'},{key:'shoulders',label:'Shoulders (cm)'},
  {key:'leftThigh',label:'Left Thigh (cm)'},{key:'rightThigh',label:'Right Thigh (cm)'},
];

function renderMeasGrid() {
  const grid=document.getElementById('measGrid'); if(!grid) return;
  grid.innerHTML=MEAS_FIELDS.map(f=>`
    <div class="meas-field">
      <div class="meas-label">${f.label}</div>
      <input class="inp" type="number" step="0.1" id="meas-${f.key}" value="${S.measurements[f.key]||''}" placeholder="--">
    </div>`).join('');
}

function saveMeasurements() {
  MEAS_FIELDS.forEach(f=>{ const el=document.getElementById('meas-'+f.key); if(el) S.measurements[f.key]=el.value; });
  save(); showToast('Measurements saved!');
}

// CHART
function drawChart(canvasId,weights,color,h) {
  const canvas=document.getElementById(canvasId); if(!canvas) return;
  const ctx=canvas.getContext('2d');
  const w=canvas.offsetWidth||300;
  canvas.width=w; canvas.height=h;
  ctx.clearRect(0,0,w,h);
  if(weights.length<2) {
    ctx.fillStyle='#3a4040'; ctx.font='11px DM Mono,monospace'; ctx.textAlign='center';
    ctx.fillText('Log at least 2 entries to see chart',w/2,h/2); return;
  }
  const vals=weights.map(x=>x.val);
  const minV=Math.min(...vals)-1, maxV=Math.max(...vals)+1;
  const pad={t:10,r:12,b:24,l:38};
  const cw=w-pad.l-pad.r, ch=h-pad.t-pad.b;
  ctx.strokeStyle='#222424'; ctx.lineWidth=1;
  for(let i=0;i<=3;i++) {
    const y=pad.t+(ch/3)*i;
    ctx.beginPath(); ctx.moveTo(pad.l,y); ctx.lineTo(pad.l+cw,y); ctx.stroke();
    ctx.fillStyle='#3a4040'; ctx.font='9px DM Mono,monospace'; ctx.textAlign='right';
    ctx.fillText((maxV-(maxV-minV)*(i/3)).toFixed(1),pad.l-4,y+3);
  }
  const xs=weights.map((_,i)=>pad.l+i*(cw/(weights.length-1)));
  const ys=weights.map(pt=>pad.t+ch-((pt.val-minV)/(maxV-minV))*ch);
  const grad=ctx.createLinearGradient(0,pad.t,0,pad.t+ch);
  grad.addColorStop(0,color+'33'); grad.addColorStop(1,color+'00');
  ctx.beginPath(); ctx.moveTo(xs[0],ys[0]);
  xs.forEach((_,i)=>{ if(i>0) ctx.lineTo(xs[i],ys[i]); });
  ctx.lineTo(xs[xs.length-1],pad.t+ch); ctx.lineTo(xs[0],pad.t+ch); ctx.closePath();
  ctx.fillStyle=grad; ctx.fill();
  ctx.strokeStyle=color; ctx.lineWidth=2; ctx.lineJoin='round';
  ctx.beginPath(); xs.forEach((_,i)=>i===0?ctx.moveTo(xs[i],ys[i]):ctx.lineTo(xs[i],ys[i])); ctx.stroke();
  weights.forEach((pt,i)=>{
    ctx.beginPath(); ctx.arc(xs[i],ys[i],3,0,Math.PI*2); ctx.fillStyle=color; ctx.fill();
    if(i===0||i===weights.length-1) {
      ctx.fillStyle='#5a6060'; ctx.font='9px DM Mono,monospace';
      ctx.textAlign=i===0?'left':'right';
      ctx.fillText(pt.date.slice(5),xs[i],h-5);
    }
  });
}

// ═══════════════════════════════════════
//  SETTINGS
// ═══════════════════════════════════════
function loadSettingsForm() {
  document.getElementById('tProtein').value=S.targets.protein;
  document.getElementById('tKcal').value=S.targets.kcal;
  document.getElementById('tWater').value=S.targets.water;
  document.getElementById('tGoal').value=S.targets.weightGoal;
  ['water','meal','supp'].forEach(k=>{
    const el=document.getElementById('tog'+k.charAt(0).toUpperCase()+k.slice(1));
    if(el) el.className='toggle'+(S.reminders[k]?' on':'');
  });
}

function saveTargets() {
  S.targets.protein=parseInt(document.getElementById('tProtein').value)||135;
  S.targets.kcal=parseInt(document.getElementById('tKcal').value)||2450;
  S.targets.water=parseInt(document.getElementById('tWater').value)||3000;
  S.targets.weightGoal=parseFloat(document.getElementById('tGoal').value)||75;
  save(); renderDash(); showToast('Targets saved!');
}

function renderProfileDisplay() {
  const el=document.getElementById('profileDisplay'); if(!el) return;
  const p=S.profile;
  el.innerHTML=`
    <div class="setting-row"><span class="setting-label">Name</span><span class="setting-val">${p.name||'--'}</span></div>
    <div class="setting-row"><span class="setting-label">Height</span><span class="setting-val">${p.height?p.height+'cm':'--'}</span></div>
    <div class="setting-row"><span class="setting-label">Goal</span><span class="setting-val">${p.goal||'gain'}</span></div>`;
}

function openEditProfile() {
  document.getElementById('editName').value=S.profile.name||'';
  document.getElementById('editHeight').value=S.profile.height||'';
  document.getElementById('editWeight').value=S.weights.length?S.weights[S.weights.length-1].val:'';
  document.getElementById('modalProfile').classList.add('open');
}

function saveProfile() {
  S.profile.name=document.getElementById('editName').value.trim();
  S.profile.height=document.getElementById('editHeight').value;
  const w=parseFloat(document.getElementById('editWeight').value);
  if(w) { const t=today(); const idx=S.weights.findIndex(x=>x.date===t); if(idx>=0) S.weights[idx].val=w; else S.weights.push({date:t,val:w}); }
  save(); closeModal('modalProfile'); renderProfileDisplay(); renderDash(); showToast('Profile saved!');
}

function renderGymDaysCard() {
  const el=document.getElementById('gymDaysCard'); if(!el) return;
  el.innerHTML='<div class="setting-row"><span class="setting-label">Gym days</span><span class="setting-val">'+S.gymDays.map(d=>DAYS[d]).join(', ')+'</span></div>';
}

function openGymDaysEditor() {
  const picker=document.getElementById('gymDayPicker');
  picker.innerHTML=DAYS.map((n,i)=>`<button class="ob-option ${S.gymDays.includes(i)?'selected':''}" style="padding:10px 14px" onclick="this.classList.toggle('selected')" data-day="${i}">${n}</button>`).join('');
  document.getElementById('modalGymDays').classList.add('open');
}

function saveGymDays() {
  const selected=[...document.querySelectorAll('#gymDayPicker .ob-option.selected')].map(el=>parseInt(el.dataset.day));
  S.gymDays=selected.length?selected:[1,3,5];
  save(); closeModal('modalGymDays'); renderGymDaysCard(); renderDash(); showToast('Gym days saved!');
}

function renderExLibrary() {
  const el=document.getElementById('exLibraryCard'); if(!el) return;
  if(!S.exercises.length) { el.innerHTML='<div class="empty"><div class="empty-icon">🏋️</div>No exercises yet</div>'; return; }
  el.innerHTML=S.exercises.map((ex,i)=>`
    <div class="ex-builder-item">
      <div class="ex-builder-name"><div>${ex.name}</div><div class="ex-builder-target">${ex.target} · ${ex.muscles}</div></div>
      <button class="ex-builder-del" onclick="deleteExercise(${i})">✕</button>
    </div>`).join('');
}

function openAddExercise() { document.getElementById('modalAddEx').classList.add('open'); }

function saveExercise() {
  const name=document.getElementById('exName').value.trim();
  if(!name) { showToast('Enter exercise name'); return; }
  S.exercises.push({ name, target:document.getElementById('exTarget').value.trim()||'3 × 10', muscles:document.getElementById('exMuscle').value.trim()||'' });
  save();
  document.getElementById('exName').value='';
  document.getElementById('exTarget').value='';
  document.getElementById('exMuscle').value='';
  closeModal('modalAddEx'); renderExLibrary(); showToast('Exercise added!');
}

function deleteExercise(i) {
  if(!confirm('Remove '+S.exercises[i].name+'?')) return;
  S.exercises.splice(i,1); save(); renderExLibrary(); showToast('Removed');
}

function toggleReminder(type,btn) {
  S.reminders[type]=!S.reminders[type];
  btn.classList.toggle('on',S.reminders[type]);
  save();
  if(S.reminders[type]) { requestNotifPermission(); showToast(type+' reminders ON'); }
  else showToast(type+' reminders OFF');
}

// ═══════════════════════════════════════
//  BACKUP & RESTORE
// ═══════════════════════════════════════
function exportData() {
  const blob=new Blob([JSON.stringify(S,null,2)],{type:'application/json'});
  const a=document.createElement('a'); a.href=URL.createObjectURL(blob);
  a.download='fittrack-backup-'+today()+'.json'; a.click();
  showToast('Backup downloaded!');
}

function clearData() {
  if(!confirm('Delete ALL data? Cannot be undone.')) return;
  localStorage.removeItem(KEY);
  showToast('Data cleared');
  setTimeout(()=>location.reload(),600);
}

function importData() {
  const input=document.createElement('input');
  input.type='file'; input.accept='.json';
  input.onchange=e=>{
    const file=e.target.files[0]; if(!file) return;
    const reader=new FileReader();
    reader.onload=ev=>{
      try {
        const imported=JSON.parse(ev.target.result);
        // Validate it looks like FitTrack data
        if(!imported.hasOwnProperty('onboarded')) { showToast('Invalid backup file'); return; }
        if(!confirm('This will replace ALL current data with the backup. Continue?')) return;
        S=imported;
        save();
        showToast('✓ Data restored successfully!');
        setTimeout(()=>location.reload(),800);
      } catch(e) { showToast('Could not read file'); }
    };
    reader.readAsText(file);
  };
  input.click();
}

// ═══════════════════════════════════════
//  NOTIFICATIONS
// ═══════════════════════════════════════
function checkNotifPermission() {
  if(!('Notification' in window)) return;
  if(Notification.permission==='default') document.getElementById('notifBanner').style.display='flex';
  else document.getElementById('notifBanner').style.display='none';
}

function requestNotifPermission() {
  if(!('Notification' in window)) { showToast('Notifications not supported'); return; }
  Notification.requestPermission().then(p=>{
    document.getElementById('notifBanner').style.display='none';
    showToast(p==='granted'?'✓ Notifications enabled':'Notifications blocked');
  });
}

function scheduleReminders() {
  if(!('Notification' in window)||Notification.permission!=='granted') return;
  if(S.reminders.water) {
    const now=new Date();
    const minsUntilNext=120-(now.getMinutes()%120);
    setTimeout(()=>{
      if(S.reminders.water) new Notification('💧 FitTrack',{body:'Time to drink water! Stay on track.'});
      setInterval(()=>{ if(S.reminders.water) new Notification('💧 FitTrack',{body:'Drink water!'}); },120*60*1000);
    },minsUntilNext*60*1000);
  }
}

// ═══════════════════════════════════════
//  MODALS
// ═══════════════════════════════════════
function closeModal(id) { document.getElementById(id).classList.remove('open'); }
document.addEventListener('DOMContentLoaded',()=>{
  document.querySelectorAll('.modal-overlay').forEach(m=>m.addEventListener('click',e=>{ if(e.target===m) m.classList.remove('open'); }));
});

// ═══════════════════════════════════════
//  TOAST
// ═══════════════════════════════════════
let toastTimer;
function showToast(msg) {
  const t=document.getElementById('toast');
  t.textContent=msg; t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer=setTimeout(()=>t.classList.remove('show'),2200);
}

// ═══════════════════════════════════════
//  WEEKLY PLANNER
// ═══════════════════════════════════════
let plannerWeekOffset = 0; // 0 = current week

function getWeekDates(offset) {
  const now = new Date();
  const dow = now.getDay(); // 0=Sun
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((dow===0?7:dow) - 1) + (offset * 7));
  monday.setHours(0,0,0,0);
  return Array.from({length:7}, (_,i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d.toISOString().slice(0,10);
  });
}

function renderWeeklyPlanner() {
  const weekDates = getWeekDates(plannerWeekOffset);
  const monday = new Date(weekDates[0]+'T12:00:00');
  const sunday = new Date(weekDates[6]+'T12:00:00');
  const fmt = d => DAYS[d.getDay()]+' '+d.getDate()+' '+MONTHS[d.getMonth()];

  // Week header
  document.getElementById('plannerWeekLabel').textContent = fmt(monday) + ' — ' + fmt(sunday);

  // Totals for week
  let weekP=0, weekK=0, gymCount=0, restCount=0;
  weekDates.forEach(date => {
    const gym = S.gymDays.includes(new Date(date+'T12:00:00').getDay());
    if(gym) gymCount++; else restCount++;
    getPresetMeals(date).forEach(m=>{ weekP+=m.protein; weekK+=m.kcal; });
  });
  document.getElementById('plannerWeekP').textContent = Math.round(weekP/7)+'g avg/day';
  document.getElementById('plannerWeekK').textContent = Math.round(weekK/7)+' kcal avg/day';
  document.getElementById('plannerGymDays').textContent = gymCount+' gym · '+restCount+' rest';

  // Grid
  const grid = document.getElementById('plannerGrid');
  const todayKey = today();
  grid.innerHTML = weekDates.map(date => {
    const d = new Date(date+'T12:00:00');
    const gym = S.gymDays.includes(d.getDay());
    const isToday = date === todayKey;
    const md = S.meals[date] || {};
    const meals = getPresetMeals(date);
    const checkedCount = meals.filter(m => md.checklist && md.checklist[m.id]).length;
    const totalP = meals.reduce((a,m)=>a+m.protein,0);
    const totalK = meals.reduce((a,m)=>a+m.kcal,0);
    const dayName = DAYS[d.getDay()];
    const dayNum = d.getDate();

    return `<div class="planner-day ${isToday?'today':''} ${gym?'gym-day':'rest-day'}" onclick="togglePlannerDay('${date}')">
      <div class="planner-day-hdr">
        <div class="planner-day-name">${dayName}</div>
        <div class="planner-day-num">${dayNum}</div>
        <div class="planner-day-badge ${gym?'badge-gym':'badge-rest'}">${gym?'💪':'🛌'}</div>
      </div>
      <div class="planner-day-stats">
        <span style="color:var(--blue)">${totalP}g P</span>
        <span style="color:var(--accent)">${totalK}cal</span>
      </div>
      <div class="planner-progress">
        <div class="planner-progress-fill" style="width:${meals.length?Math.round(checkedCount/meals.length*100):0}%"></div>
      </div>
      <div class="planner-checked">${checkedCount}/${meals.length} logged</div>
      <div class="planner-day-meals" id="pdm-${date}" style="display:none">
        ${meals.map(m=>`
          <div class="planner-meal-row">
            <div class="planner-meal-dot ${md.checklist&&md.checklist[m.id]?'done':''}"></div>
            <div class="planner-meal-info">
              <div class="planner-meal-name">${m.name}</div>
              <div class="planner-meal-meta">${m.time} · ${m.protein}g P · ${m.kcal}kcal</div>
              <div class="planner-meal-items">${m.items.map(it=>it.name).join(', ')}</div>
            </div>
          </div>`).join('')}
      </div>
    </div>`;
  }).join('');
}

function togglePlannerDay(date) {
  const el = document.getElementById('pdm-'+date);
  if(!el) return;
  const isOpen = el.style.display !== 'none';
  // Close all first
  document.querySelectorAll('[id^="pdm-"]').forEach(e => e.style.display='none');
  document.querySelectorAll('.planner-day').forEach(e => e.classList.remove('expanded'));
  if(!isOpen) {
    el.style.display = 'block';
    el.closest('.planner-day').classList.add('expanded');
  }
}

function prevWeek() { plannerWeekOffset--; renderWeeklyPlanner(); }
function nextWeek() { plannerWeekOffset++; renderWeeklyPlanner(); }
function thisWeek() { plannerWeekOffset=0; renderWeeklyPlanner(); }

// ═══════════════════════════════════════
//  SHOPPING LIST
// ═══════════════════════════════════════
function generateShoppingList() {
  const weekDates = getWeekDates(plannerWeekOffset);
  const ingredientMap = {}; // key: ingredient name, value: { qty, category, count }

  weekDates.forEach(date => {
    const meals = getPresetMeals(date);
    meals.forEach(meal => {
      meal.items.forEach(item => {
        if(!item.ingredient) return;
        const key = item.ingredient.toLowerCase().trim();
        if(!ingredientMap[key]) {
          ingredientMap[key] = {
            name: item.ingredient,
            category: item.category || 'General',
            qty: item.qty || '',
            count: 1,
            rawQty: item.qty || ''
          };
        } else {
          ingredientMap[key].count++;
        }
      });
    });
  });

  // Group by category
  const categories = {};
  Object.values(ingredientMap).forEach(ing => {
    const cat = ing.category;
    if(!categories[cat]) categories[cat] = [];
    categories[cat].push(ing);
  });

  // Category order
  const catOrder = ['Protein','Dairy','Grains','Vegetables','Fruits','Nuts & Seeds','Supplements','Spices','General'];
  const catIcons = { 'Protein':'🥩','Dairy':'🥛','Grains':'🌾','Vegetables':'🥦','Fruits':'🍌','Nuts & Seeds':'🥜','Supplements':'💊','Spices':'🌿','General':'🛒' };

  const container = document.getElementById('shoppingListContent');
  if(!Object.keys(categories).length) {
    container.innerHTML = '<div class="empty"><div class="empty-icon">🛒</div>No ingredients found in meal plan</div>';
    return;
  }

  const sorted = [...catOrder.filter(c=>categories[c]), ...Object.keys(categories).filter(c=>!catOrder.includes(c))];

  container.innerHTML = sorted.map(cat => {
    const items = categories[cat];
    const icon = catIcons[cat] || '🛒';
    return `<div class="shop-category">
      <div class="shop-cat-title">${icon} ${cat}</div>
      ${items.map(ing => `
        <div class="shop-item" onclick="toggleShopItem(this)">
          <div class="shop-check"></div>
          <div class="shop-item-info">
            <div class="shop-item-name">${ing.name}</div>
            <div class="shop-item-qty">${ing.qty ? ing.qty+' per day' : ''} ${ing.count>1?' · '+ing.count+'× this week':''}</div>
          </div>
        </div>`).join('')}
    </div>`;
  }).join('');

  // Week label in shopping
  const weekDatesLocal = getWeekDates(plannerWeekOffset);
  const d0 = new Date(weekDatesLocal[0]+'T12:00:00');
  const d6 = new Date(weekDatesLocal[6]+'T12:00:00');
  document.getElementById('shopWeekLabel').textContent =
    DAYS[d0.getDay()]+' '+d0.getDate()+' '+MONTHS[d0.getMonth()]+' — '+
    DAYS[d6.getDay()]+' '+d6.getDate()+' '+MONTHS[d6.getMonth()];
}

function toggleShopItem(el) {
  el.classList.toggle('checked');
  const check = el.querySelector('.shop-check');
  check.textContent = el.classList.contains('checked') ? '✓' : '';
}

function clearShopChecks() {
  document.querySelectorAll('.shop-item.checked').forEach(el => {
    el.classList.remove('checked');
    el.querySelector('.shop-check').textContent = '';
  });
  showToast('Shopping list cleared');
}

// ═══════════════════════════════════════
//  BOOT
// ═══════════════════════════════════════
load();
initOb();
if(S.onboarded) initApp();

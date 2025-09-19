<script setup>
import { ref, computed, onMounted } from "vue";
import {
  createUser,
  createVote,
  fetchVotes,
  fetchUsers, // <— utilise la nouvelle route GET /api/getUsers
} from "./services/api";

const pseudo = ref("");
const email = ref("");
const userId = ref(null);
const creating = ref(false);
const createErr = ref("");

const result = ref("oui"); // 'oui' | 'non'
const voting = ref(false);
const voteErr = ref("");
const lastVoteOk = ref(false);

const votes = ref([]); // [{id,user_id,result:boolean,createdAt}]
const usersById = ref(new Map()); // Map<id, {id,pseudo,email,...}>
const loadingData = ref(false);
const loadErr = ref("");

// Helpers d'affichage de date (supporte createdAt ISO ou _ts epoch secondes)
function toDisplayDate(v) {
  const ts = v?.createdAt
    ? new Date(v.createdAt)
    : v?._ts
    ? new Date((Number(v._ts) || 0) * 1000)
    : new Date();
  return ts.toLocaleString();
}

async function handleCreateUser() {
  createErr.value = "";
  if (!pseudo.value || !email.value) {
    createErr.value = "Pseudo + email requis.";
    return;
  }
  creating.value = true;
  try {
    const id = await createUser({
      pseudo: pseudo.value.trim(),
      email: email.value.trim(),
    });
    userId.value = id;
    pseudo.value = "";
    email.value = "";
    await refreshData();
  } catch (e) {
    createErr.value = String(e?.message ?? e);
  } finally {
    creating.value = false;
  }
}

async function handleVote() {
  voteErr.value = "";
  lastVoteOk.value = false;
  if (!userId.value) {
    voteErr.value = "Crée d’abord ton utilisateur.";
    return;
  }
  voting.value = true;
  try {
    await createVote({ user_id: userId.value, result: result.value === "oui" });
    lastVoteOk.value = true;
    await refreshData();
  } catch (e) {
    voteErr.value = String(e?.message ?? e);
  } finally {
    voting.value = false;
  }
}

async function refreshData() {
  loadingData.value = true;
  loadErr.value = "";
  try {
    const [v, u] = await Promise.all([fetchVotes(), fetchUsers()]);
    votes.value = Array.isArray(v) ? v : [];
    const map = new Map();
    if (Array.isArray(u)) {
      for (const user of u) map.set(user.id, user);
    }
    usersById.value = map;
  } catch (e) {
    loadErr.value = String(e?.message ?? e);
  } finally {
    loadingData.value = false;
  }
}

const total = computed(() => votes.value.length);
const yesCount = computed(
  () => votes.value.filter((x) => x.result === true).length
);
const noCount = computed(
  () => votes.value.filter((x) => x.result === false).length
);
const yesPct = computed(() =>
  total.value ? Math.round((100 * yesCount.value) / total.value) : 0
);
const noPct = computed(() =>
  total.value ? Math.round((100 * noCount.value) / total.value) : 0
);

function displayName(v) {
  const u = usersById.value.get(v.user_id);
  return u?.pseudo ?? v.user_id;
}

onMounted(refreshData);
</script>

<template>
  <div class="wrap">
    <div class="title">Bayroumeter — Votes</div>

    <div class="grid">
      <div class="card">
        <h2>Créer un utilisateur</h2>
        <div class="row">
          <div>
            <label for="pseudo">Pseudo</label>
            <input id="pseudo" v-model="pseudo" placeholder="ex: user_42" />
          </div>
          <div>
            <label for="email">Email</label>
            <input
              id="email"
              v-model="email"
              placeholder="ex: user42@mail.com"
              type="email"
            />
          </div>
        </div>
        <div class="spacer"></div>
        <div class="flex">
          <button class="btn" :disabled="creating" @click="handleCreateUser">
            Créer
          </button>
          <span v-if="userId" class="muted">Ton user_id: {{ userId }}</span>
          <span v-if="createErr" class="error">{{ createErr }}</span>
        </div>
      </div>

      <div class="card">
        <h2>Voter : “Est-ce que Bayrou nous manque ?”</h2>
        <div class="row">
          <div>
            <label for="userId">User ID</label>
            <input
              id="userId"
              v-model="userId"
              placeholder="Coller ton user_id si besoin"
            />
          </div>
          <div>
            <label for="vote">Ton vote</label>
            <select id="vote" v-model="result">
              <option value="oui">Oui</option>
              <option value="non">Non</option>
            </select>
          </div>
        </div>
        <div class="spacer"></div>
        <div class="flex">
          <button class="btn" :disabled="voting" @click="handleVote">
            Envoyer mon vote
          </button>
          <span v-if="lastVoteOk" class="chip ok">Merci, vote enregistré</span>
          <span v-if="voteErr" class="error">{{ voteErr }}</span>
        </div>
      </div>
    </div>

    <div class="spacer"></div>
    <div class="card">
      <h2>Résultats</h2>
      <div class="flex">
        <span class="chip ok">Oui: {{ yesCount }} ({{ yesPct }}%)</span>
        <span class="chip ko">Non: {{ noCount }} ({{ noPct }}%)</span>
        <span class="muted">Total: {{ total }}</span>
        <button
          class="btn secondary"
          style="margin-left: auto"
          :disabled="loadingData"
          @click="refreshData"
        >
          Rafraîchir
        </button>
      </div>
      <div class="hr"></div>
      <div v-if="loadErr" class="error">{{ loadErr }}</div>
      <div v-else>
        <table class="list">
          <thead>
            <tr>
              <th>Votant</th>
              <th>Résultat</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="v in votes" :key="v.id">
              <td>{{ displayName(v) }}</td>
              <td>
                <span class="chip" :class="v.result ? 'ok' : 'ko'">
                  {{ v.result ? "Oui" : "Non" }}
                </span>
              </td>
              <td>{{ toDisplayDate(v) }}</td>
            </tr>
            <tr v-if="!votes.length">
              <td colspan="3" class="muted center">Pas encore de votes</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<style scoped>
.spacer {
  height: 8px;
}
</style>

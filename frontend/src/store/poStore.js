const store = [];
export const poStore = {
  getAll: () => [...store],
  add: (po) => {
    if (!store.find((p) => p.id === po.id)) {
      store.unshift(po);
    }
  },
  update: (id, patch) => {
    const idx = store.findIndex((p) => p.id === id);
    if (idx !== -1) {
      store[idx] = { ...store[idx], ...patch };
    } else {
      store.unshift({ id, ...patch });
    }
  },
  has: (id) => !!store.find((p) => p.id === id)
};

// LocalStorage-based database that mimics Firestore API
// Used as a drop-in replacement for Firebase Firestore for offline/open-source use

type WhereFilter = { field: string; op: '=='; value: any };
type OrderByClause = { field: string; direction: 'asc' | 'desc' };

interface CollectionRef {
  _type: 'collection';
  path: string;
}

interface DocRef {
  _type: 'doc';
  path: string;
  id: string;
}

interface QueryRef {
  _type: 'query';
  collectionPath: string;
  wheres: WhereFilter[];
  orderBys: OrderByClause[];
}

type Ref = CollectionRef | DocRef | QueryRef;

function getStore(): Record<string, any> {
  try {
    return JSON.parse(localStorage.getItem('pivot_db') || '{}');
  } catch {
    return {};
  }
}

function setStore(store: Record<string, any>) {
  localStorage.setItem('pivot_db', JSON.stringify(store));
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
}

export function collection(_db: any, name: string): CollectionRef {
  return { _type: 'collection', path: name };
}

export function doc(dbOrCollection: any, name?: string, id?: string): DocRef {
  if (dbOrCollection._type === 'collection') {
    const coll = dbOrCollection as CollectionRef;
    const docId = id || generateId();
    return { _type: 'doc', path: `${coll.path}/${docId}`, id: docId };
  }
  // doc(db, 'collection/id')
  const docId = id || generateId();
  return { _type: 'doc', path: `${name}/${docId}`, id: docId };
}

export function query(
  coll: CollectionRef,
  ...constraints: (WhereFilter | OrderByClause)[]
): QueryRef {
  const wheres: WhereFilter[] = [];
  const orderBys: OrderByClause[] = [];
  for (const c of constraints) {
    if ('op' in c) wheres.push(c as WhereFilter);
    if ('direction' in c) orderBys.push(c as OrderByClause);
  }
  return { _type: 'query', collectionPath: coll.path, wheres, orderBys };
}

export function where(field: string, op: string, value: any): WhereFilter {
  return { field, op: op as '==', value };
}

export function orderBy(field: string, direction: string = 'asc'): OrderByClause {
  return { field, direction: direction as 'asc' | 'desc' };
}

export function serverTimestamp(): number {
  return Date.now();
}

function matchesWheres(doc: Record<string, any>, wheres: WhereFilter[]): boolean {
  return wheres.every(w => doc[w.field] === w.value);
}

function resolveDocs(ref: Ref): { id: string; data: Record<string, any> }[] {
  const store = getStore();
  if (ref._type === 'doc') {
    const doc = store[ref.path];
    return doc ? [{ id: ref.id, data: doc }] : [];
  }

  const collectionPath = ref._type === 'query' ? ref.collectionPath : ref.path;
  const wheres = ref._type === 'query' ? ref.wheres : [];
  const orderBys = ref._type === 'query' ? ref.orderBys : [];

  let docs: { id: string; data: Record<string, any> }[] = [];

  for (const [path, data] of Object.entries(store)) {
    if (path.startsWith(collectionPath + '/') && path.split('/').length === 2) {
      const id = path.split('/')[1];
      if (matchesWheres(data, wheres)) {
        docs.push({ id, data });
      }
    }
  }

  // Sort
  if (orderBys.length > 0) {
    docs.sort((a, b) => {
      for (const ob of orderBys) {
        const aVal = a.data[ob.field] ?? 0;
        const bVal = b.data[ob.field] ?? 0;
        const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
        if (cmp !== 0) return ob.direction === 'desc' ? -cmp : cmp;
      }
      return 0;
    });
  }

  return docs;
}

function makeSnapshot(ref: Ref): { forEach: (cb: (docSnap: { id: string; data: () => Record<string, any>; exists: () => boolean }) => void) => void; docs: { id: string; data: () => Record<string, any>; exists: () => boolean }[] } {
  const resolved = resolveDocs(ref);
  const docs = resolved.map(d => ({
    id: d.id,
    data: () => d.data,
    exists: () => true,
  }));
  return {
    docs,
    forEach: (cb: (docSnap: { id: string; data: () => Record<string, any>; exists: () => boolean }) => void) => {
      docs.forEach(cb);
    },
  };
}

export async function addDoc(
  coll: CollectionRef,
  data: Record<string, any>
): Promise<DocRef> {
  const store = getStore();
  const id = generateId();
  const path = `${coll.path}/${id}`;
  store[path] = { ...data };
  setStore(store);
  return { _type: 'doc', path, id };
}

export async function setDoc(
  docRef: DocRef,
  data: Record<string, any>,
  options?: { merge?: boolean }
): Promise<void> {
  const store = getStore();
  if (options?.merge) {
    store[docRef.path] = { ...(store[docRef.path] || {}), ...data };
  } else {
    store[docRef.path] = { ...data };
  }
  setStore(store);
}

export async function updateDoc(
  docRef: DocRef,
  data: Record<string, any>
): Promise<void> {
  const store = getStore();
  if (!store[docRef.path]) {
    throw new Error(`Document ${docRef.path} does not exist`);
  }
  store[docRef.path] = { ...store[docRef.path], ...data };
  setStore(store);
}

export async function deleteDoc(docRef: DocRef): Promise<void> {
  const store = getStore();
  delete store[docRef.path];
  setStore(store);
}

export async function getDocs(
  q: QueryRef
): Promise<{ docs: { id: string; data: () => Record<string, any>; exists: () => boolean }[] }> {
  return makeSnapshot(q);
}

// Real-time listener using polling (localStorage doesn't have native events across tabs,
// but we poll for changes to simulate onSnapshot)
type Snapshot = { forEach: (cb: (docSnap: { id: string; data: () => Record<string, any>; exists: () => boolean }) => void) => void; docs: { id: string; data: () => Record<string, any>; exists: () => boolean }[] };

type Unsubscribe = () => void;

export function onSnapshot(
  q: QueryRef | CollectionRef,
  callback: (snapshot: Snapshot) => void,
  errorCallback?: (error: Error) => void
): Unsubscribe {
  let lastJson = '';
  let stopped = false;

  const ref: Ref = q;
  const poll = () => {
    if (stopped) return;
    try {
      const snap = makeSnapshot(ref);
      const json = JSON.stringify(snap);
      if (json !== lastJson) {
        lastJson = json;
        callback(snap);
      }
    } catch (e: any) {
      errorCallback?.(e);
    }
  };

  poll(); // initial
  const interval = setInterval(poll, 500);

  return () => {
    stopped = true;
    clearInterval(interval);
  };
}

import { useEffect, useState } from 'react';
import Header from "./components/Header.jsx";
import TodoForm from "./components/TodoForm.jsx";
import TodoFilters from "./components/TodoFilters.jsx";
import TodoList from "./components/TodoList.jsx";
import Counter from "./components/Counter.jsx";
import ProgressBar from "./components/ProgressBar.jsx";
import './styles.css';

const API_URL = 'https://jsonplaceholder.typicode.com/todos';

const STORAGE_KEY = 'todos-lr10-2';
const USER_ID = 2;
const LIMIT = 14;
const INITIAL_FILTER = 'done'; // Початковий фільтр 'done'
const MIN_QUERY = 1;

function loadSaved() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function App() {
  const [todos, setTodos] = useState(() => loadSaved() ?? []);
  const [status, setStatus] = useState(() =>
    loadSaved() !== null ? 'success' : 'loading'
  );
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  const [filter, setFilter] = useState(INITIAL_FILTER);
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (reloadKey === 0 && loadSaved() !== null) return;
    const controller = new AbortController();
    async function fetchTodos() {
      try {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        const url = `${API_URL}?userId=${USER_ID}&_limit=${LIMIT}`;
        const response = await fetch(url, { signal: controller.signal });
        if (!response.ok) {
          throw new Error('Сервер відповів зі статусом ' + response.status);
        }
        const data = await response.json();
        setTodos(
          data.map(({ id, title, completed }) => ({ id, title, completed }))
        );
        setStatus('success');
      } catch (err) {
        if (err.name === 'AbortError') return;
        setError(
          err instanceof TypeError ? 'Немає з’єднання з мережею.' : err.message
        );
        setStatus('error');
      }
    }
    fetchTodos();
    return () => controller.abort();
  }, [reloadKey]);

  useEffect(() => {
    if (status === 'success') {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
      } catch {
    
      }
    }
  }, [todos, status]);


  function addTodo(title) {
    const newTodo = { id: Date.now(), title, completed: false };
    setTodos((prev) => [newTodo, ...prev]);
  }

  function toggleTodo(id) {
    setTodos((prev) =>
      prev.map((todo) =>
        todo.id === id ? { ...todo, completed: !todo.completed } : todo
      )
    );
  }

  function deleteTodo(id) {
    setTodos((prev) => prev.filter((todo) => todo.id !== id));
  }

  function handleReload() {
    localStorage.removeItem(STORAGE_KEY);
    setStatus('loading');
    setError('');
    setReloadKey((key) => key + 1);
  }


  const normalizedQuery = query.trim().toLowerCase();
  const visibleTodos = todos.filter((todo) => {
    const matchesFilter =
      filter === 'all' ||
      (filter === 'active' && !todo.completed) ||
      (filter === 'done' && todo.completed);
    const matchesQuery =
      normalizedQuery.length < MIN_QUERY ||
      todo.title.toLowerCase().includes(normalizedQuery);
    return matchesFilter && matchesQuery;
  });

  const doneCount = todos.filter((todo) => todo.completed).length;
  const activeCount = todos.filter((todo) => !todo.completed).length;

  return (
    <main className="app">
      <Header
        title="Графік зйомок та обробки фото"
        subtitle="React: стан, хуки та форми (ЛР № 10)"
      />

      <TodoForm onAdd={addTodo} />

    
      <TodoFilters
        filter={filter}
        onFilterChange={setFilter}
        query={query}
        onQueryChange={setQuery}
      />

      
      {status === 'loading' && (
        <p className="status" role="status">
          Завантаження завдань...
        </p>
      )}

      {status === 'error' && (
        <div className="status status-error" role="alert">
          <p>Не вдалося завантажити завдання: {error}</p>
          <button type="button" onClick={handleReload}>
            Спробувати ще раз
          </button>
        </div>
      )}

      {status === 'success' && (
        <>
          <TodoList
            todos={visibleTodos}
            onToggle={toggleTodo}
            onDelete={deleteTodo}
          />

          
          <Counter total={todos.length} done={doneCount} />

          
          <ProgressBar label="Усі виконані" value={doneCount} max={todos.length} />
          <ProgressBar label="Активні завдання" value={activeCount} max={todos.length} />

          <button
            type="button"
            className="reload-btn"
            onClick={handleReload}
            style={{ marginTop: '1rem', width: '100%', padding: '0.5rem' }}
          >
            Завантажити з сервера знову
          </button>
        </>
      )}
    </main>
  );
}

App.displayName = 'App';

export default App;
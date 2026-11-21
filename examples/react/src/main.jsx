import 'article-voice'; // registra <article-voice>
import { createRoot } from 'react-dom/client';

function App() {
  return (
    <>
      {/* React 19 pasa los atributos tal cual a los elementos personalizados */}
      <article-voice server-url="https://tts.example.com" />
      <article>
        <h1>Mi artículo</h1>
        <p>
          Escribe aquí al menos ciento veinte palabras para que el componente detecte el artículo.
        </p>
      </article>
    </>
  );
}

createRoot(document.getElementById('root')).render(<App />);

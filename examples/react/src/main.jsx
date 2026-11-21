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
          Este artículo de ejemplo existe para comprobar que el componente detecta el contenido
          principal de la página. Los lectores pueden escucharlo mientras caminan, cocinan o
          descansan la vista, y quienes tienen dificultades para leer en pantalla lo agradecen
          todavía más. El elemento calcula cuántas palabras tiene el texto, descarta menús, anuncios
          y botones, y solo ofrece la narración cuando el artículo es lo bastante largo. Por eso
          este párrafo incluye más de ciento veinte palabras: si fuera más corto, el componente no
          lo consideraría un artículo y permanecería en silencio. Cuando pulsas reproducir, la voz
          avanza frase por frase y resalta el fragmento que se está leyendo. Puedes pausar, retomar
          o detener la lectura en cualquier momento, cambiar la velocidad y elegir otra voz si el
          servidor ofrece varias. Todo esto funciona sin que tengas que escribir lógica propia.
        </p>
      </article>
    </>
  );
}

createRoot(document.getElementById('root')).render(<App />);

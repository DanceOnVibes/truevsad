import type { Metadata } from "next";
import Link from "next/link";
import { FAIRMARK_SCALE } from "@truevsad/true-cost";
import { COMPANY, EMAILS } from "@/lib/company";

export const metadata: Metadata = {
  title: "Para alojamientos y vendedores — TrueVsAd",
  description:
    "Hoteles pequeños, casas de huéspedes y vendedores de vacaciones con precios completos pueden unirse a TrueVsAd como Fair Sellers. Unirse es gratis; los vendedores Gold no pagan nada.",
  alternates: { languages: { en: "/sellers", es: "/sellers/es" } },
};

/**
 * Spanish translation of /sellers, for hotel owners. The English page is the official version:
 * any change there must be made here on the same day, and checked by a native speaker.
 */
export default function SellersSpanishPage() {
  return (
    <main lang="es">
      <p className="hint">
        <Link href="/sellers" lang="en">
          Read in English
        </Link>
      </p>
      <h1>Para alojamientos y vendedores</h1>
      <p className="lead">
        TrueVsAd muestra a las familias del Reino Unido lo que realmente cuestan unas vacaciones. Si sus precios ya son
        completos, nos gustaría mostrar sus ofertas a esas familias.
      </p>
      <p className="hint">
        Esta es una traducción para su comodidad. La versión oficial es la <Link href="/sellers">página en inglés</Link>
        ; si hay alguna diferencia, vale la versión en inglés.
      </p>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Dónde estamos ahora</h2>
        <p>
          Las ofertas destacadas todavía no están activas. Empezamos con <strong>hoteles pequeños y casas de
          huéspedes</strong>, y ya estamos hablando con nuestros primeros vendedores. Hasta que se abran las ofertas
          destacadas, nada en TrueVsAd es de pago.
        </p>
      </div>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Quién puede unirse</h2>
        <p>
          Hoteles pequeños, casas de huéspedes y empresas de vacaciones cuyo precio anunciado es el precio que paga la
          familia. Comprobamos:
        </p>
        <ul>
          <li>
            <strong>Que es una empresa real:</strong> registrada y activa en el registro oficial de su país (Companies
            House en el Reino Unido).
          </li>
          <li>
            <strong>Que puede alquilar habitaciones:</strong> la licencia o el número de registro turístico, cuando su
            país o región lo exige.
          </li>
          <li>
            <strong>Paquetes protegidos:</strong> si vende vuelos con alojamiento, una licencia ATOL, comprobada en el
            registro de la autoridad de aviación civil británica (CAA). Un hotel que solo vende habitaciones no la
            necesita.
          </li>
          <li>
            <strong>Ninguna sanción reciente por precios engañosos</strong> de los organismos británicos de publicidad
            (ASA) o de competencia y consumo (CMA) en los últimos 12 meses.
          </li>
          <li>
            <strong>Un acuerdo firmado</strong> con nuestro estándar, incluido cómo se retiran las ofertas.
          </li>
        </ul>
        <p className="hint">Solo usamos fuentes oficiales, al unirse y de nuevo cada 3 meses.</p>
      </div>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>El estándar Fair Seller</h2>
        <p>
          Cada oferta destacada lleva la misma etiqueta en tres partes, para que las familias calculen su propio precio
          real:
        </p>
        <ol>
          <li>
            <strong>Siempre incluido en el precio:</strong> impuestos, gastos de reserva y de tarjeta, y todo lo que la
            familia no puede evitar. Una tasa turística local está incluida, o se muestra con su importe y &ldquo;se
            paga en el hotel&rdquo;.
          </li>
          <li>
            <strong>Extras opcionales, cada uno con su precio exacto:</strong> desayuno o mejoras de régimen,
            traslados al aeropuerto (o &ldquo;llegada por su cuenta&rdquo; sin penalización), maletas facturadas y
            similares. Nunca hay nada marcado de antemano.
          </li>
          <li>
            <strong>Lo que no se ofrece:</strong> por ejemplo &ldquo;sin traslados&rdquo;, para que nadie lo suponga.
          </li>
        </ol>
        <ul>
          <li>Se nombra el tipo de habitación, y las fotos muestran ese tipo de habitación.</li>
          <li>
            Las comidas se describen con sus propias palabras: qué incluye cada comida y su horario. Un desayuno
            sencillo descrito con honestidad cumple el estándar; una promesa que no se cumple, no.
          </li>
          <li>
            La oferta debe alcanzar FairMark Gold ({FAIRMARK_SCALE.gold}% o menos sin incluir) o Fair Price (
            {FAIRMARK_SCALE.fair}% o menos), calculado con el <Link href="/fairmark/method">mismo método</Link> que cada
            recibo. Los anuncios con &ldquo;más impuestos y tasas&rdquo; no pueden destacarse.
          </li>
          <li>Nuestro sistema calcula el precio de cada oferta destacada antes de mostrarla, y otra vez cada noche.</li>
          <li>
            Si un precio cambia, aparece un cargo que no estaba en la etiqueta o falla una comprobación, la oferta se
            retira esa misma noche.
          </li>
        </ul>
      </div>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Cuánto cuesta</h2>
        <table className="board">
          <thead>
            <tr>
              <th>Su FairMark</th>
              <th>Lo que nos paga</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Unirse</td>
              <td>Gratis, siempre</td>
            </tr>
            <tr>
              <td>
                <strong>FairMark Gold</strong> ({FAIRMARK_SCALE.gold}% o menos sin incluir)
              </td>
              <td>Nada</td>
            </tr>
            <tr>
              <td>
                <strong>Fair Price</strong> (más del {FAIRMARK_SCALE.gold}%, hasta el {FAIRMARK_SCALE.fair}%)
              </td>
              <td>1% de las reservas hechas a través de TrueVsAd</td>
            </tr>
            <tr>
              <td>Más del {FAIRMARK_SCALE.fair}% sin incluir</td>
              <td>No puede destacarse</td>
            </tr>
          </tbody>
        </table>
        <p>
          <strong>Ganamos menos cuando usted mejora.</strong> Un vendedor Fair paga el 1% y un vendedor Gold no paga
          nada. Es a propósito: los vendedores más justos deben pagar menos. FairMark lo calcula nuestro sistema con un
          método público, nunca a mano, así que no podemos bajar a un vendedor para ganar más, y cualquiera puede
          impugnar una cifra.
        </p>
        <p>
          Cómo se cuentan las reservas (por ejemplo, con un código de reserva o un enlace de referencia) se fija en el
          acuerdo con el vendedor. Nunca cobramos a las familias ni gestionamos la reserva.
        </p>
        <p className="hint">
          <strong>Si cambian nuestras tarifas:</strong> las revisaremos durante 2027, cuando veamos cómo funcionan.
          Cualquier cambio se publica aquí y se envía a cada vendedor destacado antes de aplicarse.
        </p>
      </div>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Lo que el dinero nunca puede comprar</h2>
        <ul>
          <li>Ser destacado: cumplir el estándar es la única forma de entrar.</li>
          <li>Un FairMark mejor, una ✓ en la clasificación de vendedores o un puesto en un ranking.</li>
          <li>
            Ocultar el recibo de una familia. Cualquier familia puede seguir comprobando cualquiera de sus ofertas,
            destacada o no, y ver el resultado.
          </li>
        </ul>
        <p>
          Las ofertas destacadas siempre llevan la etiqueta &ldquo;Featured&rdquo; (destacada) y se muestran aparte de
          las ofertas que comprueban las familias.
        </p>
      </div>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Si las familias informan de un problema</h2>
        <ul>
          <li>
            Los avisos nos llegan en privado, con pruebas, y nunca se publican. Un solo aviso nunca retira a nadie.
          </li>
          <li>Usted recibe los hechos y 14 días para responder; la oferta queda en pausa hasta que responda.</li>
          <li>El mismo problema de 2 o más familias independientes en 12 meses es una falta.</li>
          <li>3 faltas, o no responder a un aviso, le retira de Fair Sellers durante 6 meses.</li>
          <li>
            Solo publicamos nuestra propia decisión, como un hecho (por ejemplo &ldquo;retirado por no cumplir la
            norma de descripción de habitaciones&rdquo;), nunca las acusaciones de las familias.
          </li>
        </ul>
        <p>
          Cada vendedor destacado recibe además un informe privado sobre qué cambiar para llegar a Gold, a partir de
          las cifras de nuestro sistema.
        </p>
      </div>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Cómo solicitarlo</h2>
        <p>
          Escriba a <a href={`mailto:${EMAILS.partners}?subject=Fair%20Seller%20application`}>{EMAILS.partners}</a>{" "}
          (en inglés o en español) con:
        </p>
        <ul>
          <li>el nombre de su empresa, el país y el número de registro;</li>
          <li>su licencia o número de registro turístico, si lo necesita;</li>
          <li>su número ATOL, si vende vuelos con alojamiento;</li>
          <li>su web, y una oferta de ejemplo con su precio completo y sus extras.</li>
        </ul>
        <p className="hint">
          Envíe solo datos de la empresa: ningún nombre de huéspedes ni datos de reservas. Guardamos lo que nos envía, y
          nuestras comprobaciones, mientras sea Fair Seller y 12 meses después, o 12 meses después de nuestra respuesta
          si no se une. Consulte nuestra <Link href="/privacy">política de privacidad</Link> (en inglés).
        </p>
      </div>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Por favor, lea esto: qué es TrueVsAd y qué no es</h2>
        <ul>
          <li>
            <strong>No somos una agencia de viajes ni una web de reservas.</strong> Nunca aceptamos reservas ni pagos,
            y no somos parte del contrato entre la familia y el vendedor. Las familias reservan directamente con usted.
          </li>
          <li>
            <strong>Ser destacado no es una recomendación de las vacaciones.</strong> Significa que el precio anunciado
            cumplía nuestro estándar cuando lo comprobamos. No inspeccionamos hoteles ni garantizamos habitaciones,
            servicio o seguridad.
          </li>
          <li>
            <strong>FairMark solo mide el precio:</strong> cuánto dejó fuera un anuncio. No dice nada de la calidad de
            un hotel.
          </li>
          <li>
            <strong>Usted sigue siendo responsable de sus anuncios</strong> y de cumplir la ley donde trabaja, incluidas
            las normas de precios del Reino Unido, las de viajes combinados, ATOL y las licencias locales. Nuestros
            informes son orientación para cumplir nuestro estándar, no asesoramiento jurídico.
          </li>
          <li>
            <strong>Nosotros decidimos quién se destaca.</strong> Podemos rechazar una solicitud, o retirar a un
            vendedor o una oferta que ya no cumple el estándar. Damos el motivo, según las normas publicadas.
          </li>
          <li>
            <strong>Las familias conservan todos sus derechos</strong> frente al vendedor con el que reservaron, muestre
            lo que muestre TrueVsAd.
          </li>
        </ul>
        <p className="hint">
          TrueVsAd pertenece a {COMPANY.name}, una empresa registrada en Inglaterra y Gales. El acuerdo con el
          vendedor recoge los términos completos. Preguntas:{" "}
          <a href={`mailto:${EMAILS.partners}`}>{EMAILS.partners}</a>.
        </p>
      </div>
    </main>
  );
}

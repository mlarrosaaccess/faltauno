import Link from "next/link";

export default function NotFound() {
  return (
    <div className="phone phone-top">
      <h1>No está</h1>
      <p className="lead">Ese partido o esa página no existe.</p>
      <Link className="btn btn-primary" href="/inicio">
        Volver al inicio
      </Link>
    </div>
  );
}

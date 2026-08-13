import { redirect } from "next/navigation";

/** Abrir o app cai direto na aba dos números. */
export default function Home() {
  redirect("/numeros");
}

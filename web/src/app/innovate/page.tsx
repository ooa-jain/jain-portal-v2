import { redirect } from "next/navigation";

/** Short link to Innovation & Emerging Areas, which is not listed in the menus. */
export default function InnovatePage() {
  redirect("/iea");
}

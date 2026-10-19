import { redirect } from "next/navigation";

// Раньше здесь была кнопка-симуляция оплаты, дающая доступ бесплатно. Теперь — только реальная оплата.
export default function BlockedPage() {
  redirect("/subscribe");
}

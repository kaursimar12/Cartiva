import { EmptyState } from "@/components/common/empty-state";

export default function NotFound() {
  return (
    <EmptyState
      icon="🧭"
      title="Page not found"
      description="The product or page you're looking for doesn't exist."
      action={{ label: "Back to home", href: "/" }}
    />
  );
}

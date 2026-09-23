import { notFound } from "next/navigation";
import { ModuleOverview } from "@/components/module-overview";
import { getModuleConfig, moduleConfigs } from "@/modules/platform/module-config";

export function generateStaticParams() {
  return moduleConfigs.map((module) => ({ module: module.slug }));
}

export default async function ModulePage({
  params,
}: {
  params: Promise<{ module: string }>;
}) {
  const { module: slug } = await params;
  const config = getModuleConfig(slug);

  if (!config) {
    notFound();
  }

  return <ModuleOverview config={config} />;
}

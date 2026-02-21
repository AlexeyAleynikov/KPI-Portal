"use client";
import useSWR from "swr";
import { linksApi } from "@/lib/api";
import { ExternalLink } from "lucide-react";

export default function LinksSection() {
  const { data: sections, isLoading } = useSWR("links", () =>
    linksApi.getLinks().then((r) => r.data)
  );

  if (isLoading) {
    return <div className="h-32 animate-pulse bg-gray-200 dark:bg-gray-700 rounded-xl" />;
  }
  if (!sections?.length) return null;

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-gray-700 dark:text-gray-200">Рабочие инструменты</h3>
      {sections.map((section: any) => (
        <div key={section.id} className="bg-white dark:bg-gray-800 rounded-xl shadow p-5">
          <div className="flex items-center gap-2 mb-4">
            {section.icon && <img src={section.icon} className="w-5 h-5" alt="" />}
            <h4 className="font-medium text-gray-700 dark:text-gray-200">{section.name}</h4>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {section.links.map((link: any) => (
              <a
                key={link.id}
                href={link.url}
                target={link.open_in_iframe ? "_self" : "_blank"}
                rel="noopener noreferrer"
                className="flex items-center gap-2 p-3 rounded-lg border border-gray-100 dark:border-gray-700 hover:border-brand-500 hover:bg-blue-50 dark:hover:bg-gray-700 transition group"
              >
                {link.icon ? (
                  <img src={link.icon} className="w-4 h-4 flex-shrink-0" alt="" />
                ) : (
                  <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-brand-500 flex-shrink-0" />
                )}
                <span className="text-sm text-gray-700 dark:text-gray-300 truncate">{link.name}</span>
              </a>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

import React from 'react';
import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import { getToolBySlug, TOOLS } from '../../../lib/tools-data';
import { ToolLayout } from '../../../components/tools/ToolLayout';
import { ToolRunner } from '../../../components/tools/ToolRunner';

interface ToolPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return TOOLS.map(tool => ({
    slug: tool.slug,
  }));
}

export async function generateMetadata({ params }: ToolPageProps): Promise<Metadata> {
  const { slug } = await params;
  const tool = getToolBySlug(slug);

  if (!tool) {
    return {
      title: 'Tool Not Found | N1 Toolbox',
    };
  }

  return {
    title: `${tool.title} — Free Online Client-Side Utility | N1 Toolbox`,
    description: tool.description,
    keywords: tool.tags,
    openGraph: {
      title: `${tool.title} | N1 Toolbox`,
      description: tool.shortDescription,
    },
  };
}

export default async function ToolPage({ params }: ToolPageProps) {
  const { slug } = await params;
  const tool = getToolBySlug(slug);

  if (!tool) {
    notFound();
  }

  return (
    <ToolLayout tool={tool}>
      <ToolRunner slug={tool.slug} />
    </ToolLayout>
  );
}

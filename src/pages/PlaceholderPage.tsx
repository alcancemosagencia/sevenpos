import React from 'react';
import { LucideIcon, Layers } from 'lucide-react';
import { PageContainer } from '../components/shell/PageContainer';
import { PageHeader } from '../components/shell/PageHeader';
import { Card } from '../components/ui/Card';
import { EmptyState } from '../components/ui/EmptyState';
import { Badge } from '../components/ui/Badge';

export interface PlaceholderPageProps {
  title: string;
  subtitle?: string;
  modulePhase?: string;
  icon?: LucideIcon;
}

export const PlaceholderPage: React.FC<PlaceholderPageProps> = ({
  title,
  subtitle = 'Módulo programado para las siguientes fases del producto.',
  modulePhase = 'Fase Posterior (AG-02+)',
  icon: Icon = Layers,
}) => {
  return (
    <PageContainer>
      <PageHeader
        title={title}
        subtitle={subtitle}
        actions={
          <Badge variant="brand" size="md">
            {modulePhase}
          </Badge>
        }
      />

      <Card variant="default" padding="lg" className="my-auto">
        <EmptyState
          icon={<Icon size={28} className="text-text-secondary" />}
          title={`Estructura de navegación: ${title}`}
          description="Este módulo forma parte de la arquitectura de navegación completa de SevenPOS. Su lógica funcional se implementará en su respectiva fase según el roadmap."
        />
      </Card>
    </PageContainer>
  );
};

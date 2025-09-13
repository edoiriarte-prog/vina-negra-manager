import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import React from 'react';

type KpiCardProps = {
  title: string;
  value: string;
  icon: React.ReactNode;
  description: string;
};

export default function KpiCard({
  title,
  value,
  icon,
  description,
}: KpiCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground h-8">{description}</p>
      </CardContent>
    </Card>
  );
}

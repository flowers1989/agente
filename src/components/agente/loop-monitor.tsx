"use client";

import React, { useState, useEffect } from "react";
import { LoopContext, LoopIteration } from "@/lib/agents/agent-loop";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertCircle, CheckCircle, Clock, Zap } from "lucide-react";

interface LoopMonitorProps {
  loopContext?: LoopContext;
  isRunning?: boolean;
  onStop?: () => void;
}

/**
 * Componente para monitorear el Agent Loop en tiempo real
 */
export function LoopMonitor({ loopContext, isRunning = false, onStop }: LoopMonitorProps) {
  const [expandedIteration, setExpandedIteration] = useState<number | null>(null);

  if (!loopContext) {
    return (
      <div className="p-4 border border-dashed border-gray-300 rounded-lg text-center text-gray-500">
        Sin datos del loop disponibles
      </div>
    );
  }

  const successRate = loopContext.history.filter((h) => h.observation?.success).length / (loopContext.history.length || 1);
  const averageDuration = loopContext.history.reduce((sum, h) => sum + h.duration, 0) / (loopContext.history.length || 1);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 p-4 rounded-lg border border-purple-200">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-semibold text-gray-900">Agent Loop Monitor</h3>
            <p className="text-sm text-gray-600 mt-1">{loopContext.objective}</p>
          </div>
          {isRunning && (
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-sm font-medium text-green-600">En ejecución</span>
            </div>
          )}
        </div>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white p-3 rounded-lg border border-gray-200">
          <div className="text-2xl font-bold text-purple-600">{loopContext.currentIteration}</div>
          <div className="text-xs text-gray-600">Iteraciones</div>
        </div>
        <div className="bg-white p-3 rounded-lg border border-gray-200">
          <div className="text-2xl font-bold text-blue-600">{(successRate * 100).toFixed(0)}%</div>
          <div className="text-xs text-gray-600">Tasa de Éxito</div>
        </div>
        <div className="bg-white p-3 rounded-lg border border-gray-200">
          <div className="text-2xl font-bold text-green-600">{loopContext.errors.length}</div>
          <div className="text-xs text-gray-600">Errores</div>
        </div>
        <div className="bg-white p-3 rounded-lg border border-gray-200">
          <div className="text-2xl font-bold text-amber-600">{averageDuration.toFixed(0)}ms</div>
          <div className="text-xs text-gray-600">Duración Promedio</div>
        </div>
      </div>

      {/* Barra de Progreso */}
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium text-gray-700">Progreso</span>
          <span className="text-xs text-gray-500">
            {loopContext.currentIteration}/{loopContext.maxIterations}
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-gradient-to-r from-purple-500 to-blue-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${(loopContext.currentIteration / loopContext.maxIterations) * 100}%` }}
          />
        </div>
      </div>

      {/* Estado Final */}
      {loopContext.isComplete && (
        <div className={`p-3 rounded-lg border-l-4 ${loopContext.finalResult ? "bg-green-50 border-green-500" : "bg-red-50 border-red-500"}`}>
          <div className="flex items-center gap-2">
            {loopContext.finalResult ? (
              <>
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span className="text-sm font-medium text-green-700">Loop completado exitosamente</span>
              </>
            ) : (
              <>
                <AlertCircle className="w-5 h-5 text-red-600" />
                <span className="text-sm font-medium text-red-700">Loop completado con errores</span>
              </>
            )}
          </div>
        </div>
      )}

      {/* Historial de Iteraciones */}
      <div className="space-y-2">
        <h4 className="text-sm font-semibold text-gray-900">Historial de Iteraciones</h4>
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {loopContext.history.map((iteration) => (
            <IterationCard
              key={iteration.iterationNumber}
              iteration={iteration}
              isExpanded={expandedIteration === iteration.iterationNumber}
              onToggle={() =>
                setExpandedIteration(expandedIteration === iteration.iterationNumber ? null : iteration.iterationNumber)
              }
            />
          ))}
        </div>
      </div>

      {/* Errores */}
      {loopContext.errors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <h4 className="text-sm font-semibold text-red-900 mb-2">Errores Encontrados</h4>
          <ul className="space-y-1">
            {loopContext.errors.map((error, i) => (
              <li key={i} className="text-xs text-red-700">
                • {error}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Controles */}
      <div className="flex gap-2">
        {isRunning && onStop && (
          <Button onClick={onStop} variant="destructive" size="sm">
            Detener Loop
          </Button>
        )}
        <Button variant="outline" size="sm" className="ml-auto">
          Exportar Reporte
        </Button>
      </div>
    </div>
  );
}

/**
 * Componente para mostrar una iteración individual
 */
function IterationCard({
  iteration,
  isExpanded,
  onToggle,
}: {
  iteration: LoopIteration;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const statusColor = iteration.observation?.success
    ? "text-green-600 bg-green-50 border-green-200"
    : "text-red-600 bg-red-50 border-red-200";

  return (
    <div className={`border rounded-lg p-3 cursor-pointer transition-all ${statusColor}`} onClick={onToggle}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm">Iteración {iteration.iterationNumber}</span>
            {iteration.observation?.success ? (
              <CheckCircle className="w-4 h-4 text-green-600" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-600" />
            )}
          </div>
          <p className="text-xs text-gray-600 mt-1">{iteration.thought}</p>
        </div>
        <div className="text-right">
          <Badge variant="outline" className="text-xs">
            {iteration.duration}ms
          </Badge>
        </div>
      </div>

      {isExpanded && (
        <div className="mt-3 pt-3 border-t border-current border-opacity-20 space-y-2">
          {iteration.action && (
            <div>
              <span className="text-xs font-semibold">Acción:</span>
              <p className="text-xs text-gray-700">{iteration.action.toolName}</p>
            </div>
          )}
          {iteration.observation && (
            <div>
              <span className="text-xs font-semibold">Resultado:</span>
              <p className="text-xs text-gray-700 truncate">{iteration.observation.result}</p>
            </div>
          )}
          {iteration.evaluation && (
            <div>
              <span className="text-xs font-semibold">Confianza:</span>
              <p className="text-xs text-gray-700">{(iteration.evaluation.confidence * 100).toFixed(0)}%</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

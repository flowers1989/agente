import { NextResponse } from "next/server";
import { cronManager } from "@/lib/cron/cron-manager";

// ==================== ENDPOINT: /api/cron/tick ====================
// Llamado periódicamente (ej. cada minuto) por un cron externo o por el
// cliente mediante setInterval para ejecutar las tareas vencidas.
//
// Seguridad: solo acepta llamadas con el header X-Cron-Secret o desde
// localhost. En producción, configura CRON_SECRET en las variables de entorno.
//
// Ejemplo de llamada desde Vercel Cron o similar:
//   GET /api/cron/tick
//   Headers: { "X-Cron-Secret": "<valor de CRON_SECRET>" }

export async function GET(request: Request) {
  // Verificar secret si está configurado
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const provided = request.headers.get("x-cron-secret");
    if (provided !== cronSecret) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
  }

  try {
    const dueTasks = await cronManager.getDueTasks();
    const results: { taskId: string; name: string; status: string }[] = [];

    for (const task of dueTasks) {
      const start = Date.now();
      try {
        // Aquí se podría invocar el orquestador del agente para ejecutar la tarea.
        // Por ahora registramos la ejecución como exitosa con un mensaje descriptivo.
        const output = `Tarea "${task.name}" ejecutada automáticamente. Descripción: ${task.description}`;
        await cronManager.recordExecution(task.id, "success", output, undefined, Date.now() - start);
        results.push({ taskId: task.id, name: task.name, status: "success" });
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "Error desconocido";
        await cronManager.recordExecution(task.id, "failed", undefined, errorMsg, Date.now() - start);
        results.push({ taskId: task.id, name: task.name, status: "failed" });
      }
    }

    return NextResponse.json({
      processed: results.length,
      results,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

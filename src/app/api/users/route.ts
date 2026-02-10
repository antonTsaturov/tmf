// // src/app/api/study/route.ts

// import { NextResponse } from 'next/server';
// import { updateStudy } from '@/lib/db/study';
// import { connectDB, createTable } from '@/lib/db/index';
// import { Tables } from '@/lib/db/schema';


// // GET: get all studies
// export async function GET() {
//   let client;
//   try {
//     client = await connectDB();
    
//     try {
//       // Пытаемся выполнить запрос
//       const result = await client.query('SELECT * FROM study ORDER BY id ASC');
//       return NextResponse.json(result.rows, { status: 200 });
      
//     } catch (dbError) {
//       const errorMessage = String(dbError);
      
//       // Если таблица не существует, создаем ее и возвращаем пустой массив
//       if (errorMessage.includes('relation "study" does not exist') || 
//           errorMessage.includes('table "study" does not exist')) {
        
//         console.log('Table "study" does not exist, creating it...');
//         createTable(Tables.STUDY)
//       }
      
//       // Если это другая ошибка, пробрасываем ее
//       throw dbError;
//     }
    
//   } catch (err) {
//     console.error('GET /api/study error:', err);
//     return NextResponse.json({ 
//       error: 'Failed to fetch studies', 
//       details: String(err) 
//     }, { status: 500 });
    
//   } finally {
//     if (client) {
//       client.release();
//     }
//   }
// }


// // POST: create or update a study
// export async function POST(request: Request) {
//   try {
//     const data = await request.json();
//     // If id is present, update; else, create
//     if (data.id) {
//       // Update existing study
//       const id = Number(data.id);
//       const updates = { ...data };
//       delete updates.id;
//       await updateStudy(id, updates);
//       return NextResponse.json({ message: 'Study updated', id }, { status: 200 });
//     } else {
//       // Create new study
//       createTable(Tables.STUDY)
//     }
//   } catch (err) {
//     console.error('POST /api/study error:', err);
//     return NextResponse.json({ error: 'Failed to create or update study', details: String(err) }, { status: 500 });
//   }
// }

// // DELETE: delete a study by id
// export async function DELETE(request: Request) {
//   try {
//     const data = await request.json();

//     if (!data.id) {
//       return NextResponse.json({ error: 'Missing study id' }, { status: 400 });
//     }

//     const id = Number(data.id);
//     const client = await connectDB();

//     try {
//       const result = await client.query('DELETE FROM study WHERE id = $1 RETURNING *', [id]);

//       if (result.rowCount === 0) {
//         return NextResponse.json({ error: 'Study not found' }, { status: 404 });
//       }

//       return NextResponse.json({ message: 'Study deleted', id }, { status: 200 });

//     } finally {
//       client.release();
//     }
//   } catch (err) {
//     console.error('DELETE /api/study error:', err);
//     return NextResponse.json({ error: 'Failed to delete study', details: String(err) }, { status: 500 });
//   }
// }

import { StudyApiHandler } from '@/app/api/base';
import { NextRequest } from 'next/server';
import { Tables } from '@/lib/db/schema';

// Создаем экземпляр класса
const studyApiHandler = new StudyApiHandler();

export async function GET(request: NextRequest) {
  return studyApiHandler.getTablePartial(Tables.USERS, request);

}

export async function POST(request: NextRequest) {
  return studyApiHandler.createOrUpdateTable(Tables.USERS, request);
}

export async function DELETE(request: NextRequest) {
  return studyApiHandler.deleteRecord(Tables.USERS, request);
}
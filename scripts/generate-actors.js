const fs = require('fs');
const path = require('path');

// Đọc file movies.json
const moviesPath = path.join(__dirname, '../constants/movies.json');
const movies = JSON.parse(fs.readFileSync(moviesPath, 'utf-8'));

// Map để lưu actors độc nhất
const actorsMap = new Map();

movies.forEach((movie) => {
  if (movie.actors && movie.actors.length > 0) {
    movie.actors.forEach((actorName) => {
      // Nếu actor chưa tồn tại, thêm vào map
      if (!actorsMap.has(actorName)) {
        actorsMap.set(actorName, {
          id: generateId(actorName),
          name: actorName,
          thumb_url: movie.thumb_url, // Lấy ảnh từ movie đầu tiên có actor này
          movieCount: 1,
        });
      } else {
        // Tăng số lượng phim của actor
        const actor = actorsMap.get(actorName);
        actor.movieCount += 1;
      }
    });
  }
});

// Chuyển Map thành Array và sắp xếp theo số lượng phim
const actors = Array.from(actorsMap.values())
  .sort((a, b) => b.movieCount - a.movieCount);

// Ghi ra file actors.json
const outputPath = path.join(__dirname, '../constants/actors.json');
fs.writeFileSync(outputPath, JSON.stringify(actors, null, 2), 'utf-8');

console.log(`✅ Đã tạo ${actors.length} actors vào file actors.json`);
console.log(`📊 Top 5 actors:`);
actors.slice(0, 5).forEach((actor, i) => {
  console.log(`   ${i + 1}. ${actor.name} - ${actor.movieCount} phim`);
});

// Hàm tạo ID từ tên actor
function generateId(name) {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

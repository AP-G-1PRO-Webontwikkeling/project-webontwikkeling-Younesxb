
async function connectToDatabase() {
    try {
        await mongoose.connect("mongodb+srv://Younes:APHogeschool@clusterofyounes.4temuqa.mongodb.net/ClusterOfYounes", {

        });
        console.log("Database connected Successfully");
    } catch (error) {
        console.error("Error connecting to database:", error);
        throw error; 
    }
}


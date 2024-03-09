var bcrypt = require('bcryptjs');

let a=async () => {
    const password="1"; // Extract form data
    const salt = await bcrypt.hash(password,12);
    const res= await bcrypt.compare(password,"$2b$12$WeYTiUowa0W3IqA9P/f/5eTRNfpNJQwIAlspn3yPcDs5OKAv9pA4K");
    console.log(res);
    console.log(salt);
    console.log(password);
}
a();
    // const query="insert into customer (name,phone_number,hash_password)values($1,$2,$3)";
    // const values=[name,phone_number,salt];
    // try{
    //   const result=await db_query(query,values);
    //   console.log(result);
    //   res.status(200).send('Row added successfully!');
    // }
    // catch(error){
    //   console.error('Error adding row:', error);
    //   res.status(500).send('Error adding row to the database.');
    // }